import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { Expense } from '../models/group.model';
import { GroupsService } from '../services/groups.service';
import { apiErrorMessage } from '../shared/api-error';
import { splitEqually } from '../shared/balances';
import { notBlank, wholeNumber } from '../shared/validators';

type SplitMode = 'equal' | 'custom';

/** a date as the yyyy-MM-dd string a date input works with, in local time */
const toInputDate = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const money = new Intl.NumberFormat('de-DE');

/** Adds an expense to a group, or edits or deletes an existing one. */
@Component({
    imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
    selector: 'app-expense-form-component',
    styleUrl: '../shared/app-form.css',
    templateUrl: './expense-form-component.html',
})
export class ExpenseFormComponent {
    private groups = inject(GroupsService);
    private router = inject(Router);
    private params = inject(ActivatedRoute).snapshot.paramMap;
    private groupId = Number(this.params.get('id'));

    group = computed(() => this.groups.group(this.groupId));

    /** set on the edit route; the expense is looked up once, as the form is filled from it */
    private expenseId = this.params.has('expenseId') ? Number(this.params.get('expenseId')) : null;
    private original = this.group()?.expenses.find((expense) => expense.id === this.expenseId);

    /** current members, plus anyone who has left but paid for or shares the expense being edited */
    people = computed(() => {
        const group = this.group();
        if (!group) return [];
        const involved = new Set([this.original?.paidById, ...(this.original?.splitBetweenIds ?? [])]);
        return [...group.members, ...group.formerMembers.filter((member) => involved.has(member.id))];
    });

    isEdit = this.expenseId !== null;
    notFound = !this.group() || (this.isEdit && !this.original);

    expenseForm = new FormGroup({
        description: new FormControl(this.original?.description ?? '', {
            nonNullable: true, validators: [Validators.required, notBlank]
        }),
        amount: new FormControl<number | null>(this.original?.amount ?? null, [
            Validators.required, Validators.min(1), wholeNumber
        ]),
        date: new FormControl(toInputDate(this.original?.date ?? new Date()), {
            nonNullable: true, validators: Validators.required
        }),
        paidById: new FormControl(this.original?.paidById ?? this.groups.meId(), { nonNullable: true }),
    });

    splitMode = signal<SplitMode>(this.original?.customShares ? 'custom' : 'equal');

    /** "equally": who shares the expense; everyone to start with */
    splitBetween = signal(new Set(this.original?.splitBetweenIds ?? this.group()?.members.map((member) => member.id)));

    /** "by amounts": what was typed for each member; null for an empty or unreadable field */
    customShares = signal(new Map<number, number | null>(
        this.original?.customShares?.map((share) => [share.memberId, share.amount])
    ));

    submitted = signal(false);
    confirmingDelete = signal(false);
    /** a save or delete is on its way to the backend */
    saving = signal(false);
    errorMessage = signal('');

    private amount = toSignal(this.expenseForm.controls.amount.valueChanges, {
        initialValue: this.expenseForm.controls.amount.value
    });

    /** "equally": what each chosen member will owe, shown while filling in the form */
    perPerson = computed(() => {
        const amount = this.validAmount();
        const count = this.splitBetween().size;
        if (amount === null || count === 0) return null;
        const shares = [...splitEqually(amount, [...this.splitBetween()]).values()];
        return { low: Math.min(...shares), high: Math.max(...shares), count };
    });

    /** "by amounts": how much of the total is not assigned yet; negative when the shares go over */
    remaining = computed(() => {
        const amount = this.validAmount();
        if (amount === null) return null;
        return amount - [...this.customShares().values()].reduce<number>((total, share) => total + (share ?? 0), 0);
    });

    toggle(memberId: number){
        this.splitBetween.update((ids) => {
            const next = new Set(ids);
            if (!next.delete(memberId)) next.add(memberId);
            return next;
        });
    }

    setShare(memberId: number, typed: string){
        const value = typed.trim() === '' ? null : Number(typed);
        this.customShares.update((shares) => new Map(shares).set(memberId, value));
    }

    onSubmit(){
        this.submitted.set(true);
        if (this.expenseForm.invalid || this.splitProblem()) {
            this.expenseForm.markAllAsTouched();
            return;
        }

        const { description, amount, date, paidById } = this.expenseForm.getRawValue();
        const expense: Omit<Expense, 'id'> = {
            description: description.trim(),
            amount: amount!,
            // noon keeps the day stable whatever the time zone
            date: new Date(`${date}T12:00:00`),
            paidById,
            ...this.split(),
        };

        this.send(this.original
            ? this.groups.updateExpense(this.groupId, this.original.id, expense)
            : this.groups.addExpense(this.groupId, expense));
    }

    deleteExpense(){
        if (!this.original) return;
        this.send(this.groups.deleteExpense(this.groupId, this.original.id));
    }

    /** Runs a change against the backend, then goes back to the group; a failure stays on the page with its message. */
    private send(change: Observable<unknown>){
        this.saving.set(true);
        this.errorMessage.set('');
        change.subscribe({
            next: () => this.router.navigate(['/groups', this.groupId]),
            error: (err) => {
                this.saving.set(false);
                this.errorMessage.set(apiErrorMessage(err));
            }
        });
    }

    descriptionError(): string {
        const description = this.expenseForm.controls.description;
        return description.touched && description.invalid ? 'Say what it was for.' : '';
    }

    amountError(): string {
        const amount = this.expenseForm.controls.amount;
        if (!amount.touched || amount.valid) return '';
        if (amount.hasError('required')) return 'Enter an amount.';
        return amount.hasError('wholeNumber') ? 'Use whole denars, no decimals.' : 'Enter an amount above zero.';
    }

    dateError(): string {
        const date = this.expenseForm.controls.date;
        return date.touched && date.invalid ? 'Pick a date.' : '';
    }

    /** only shown once the user has tried to save */
    splitError(): string {
        return this.submitted() ? this.splitProblem() : '';
    }

    private splitProblem(): string {
        if (this.splitMode() === 'equal') {
            return this.splitBetween().size === 0 ? 'Choose at least one person.' : '';
        }

        const shares = [...this.customShares().values()].filter((share) => share !== null);
        if (shares.some((share) => !Number.isInteger(share) || share < 0)) {
            return 'Use whole denars for each share.';
        }
        const remaining = this.remaining();
        // an amount problem is reported on the amount field instead
        if (remaining === null || remaining === 0) return '';
        return remaining > 0
            ? `${money.format(remaining)} ден still to assign.`
            : `The shares are ${money.format(-remaining)} ден over the total.`;
    }

    /** the split fields of the expense, for whichever mode is chosen */
    private split(): Pick<Expense, 'splitBetweenIds' | 'customShares'> {
        if (this.splitMode() === 'equal') {
            return { splitBetweenIds: [...this.splitBetween()], customShares: undefined };
        }
        const customShares = [...this.customShares()]
            .filter(([, amount]) => !!amount)
            .map(([memberId, amount]) => ({ memberId, amount: amount! }));
        return { splitBetweenIds: customShares.map((share) => share.memberId), customShares };
    }

    private validAmount(): number | null {
        const amount = this.amount();
        return amount !== null && Number.isInteger(amount) && amount >= 1 ? amount : null;
    }
}
