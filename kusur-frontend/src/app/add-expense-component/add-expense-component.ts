import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GroupsService, ME_ID } from '../services/groups.service';
import { splitEqually } from '../shared/balances';
import { notBlank, wholeNumber } from '../shared/validators';

/** today as the yyyy-MM-dd string a date input works with, in local time */
const today = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

@Component({
    imports: [DecimalPipe, ReactiveFormsModule, RouterLink],
    selector: 'app-add-expense-component',
    styleUrl: '../shared/app-form.css',
    templateUrl: './add-expense-component.html',
})
export class AddExpenseComponent {
    private groups = inject(GroupsService);
    private router = inject(Router);
    private groupId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

    protected readonly meId = ME_ID;

    group = computed(() => this.groups.group(this.groupId));

    expenseForm = new FormGroup({
        description: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank] }),
        amount: new FormControl<number | null>(null, [Validators.required, Validators.min(1), wholeNumber]),
        date: new FormControl(today(), { nonNullable: true, validators: Validators.required }),
        paidById: new FormControl(ME_ID, { nonNullable: true }),
    });

    /** who shares the expense; everyone to start with */
    splitBetween = signal(new Set(this.group()?.members.map((member) => member.id)));
    submitted = signal(false);

    private amount = toSignal(this.expenseForm.controls.amount.valueChanges, { initialValue: null });

    /** what each chosen member will owe, shown while filling in the form */
    perPerson = computed(() => {
        const amount = this.amount();
        const count = this.splitBetween().size;
        if (!amount || amount < 1 || !Number.isInteger(amount) || count === 0) return null;
        const shares = [...splitEqually(amount, [...this.splitBetween()]).values()];
        return { low: Math.min(...shares), high: Math.max(...shares), count };
    });

    toggle(memberId: number){
        this.splitBetween.update((ids) => {
            const next = new Set(ids);
            if (!next.delete(memberId)) next.add(memberId);
            return next;
        });
    }

    onSubmit(){
        this.submitted.set(true);
        if (this.expenseForm.invalid || this.splitBetween().size === 0) {
            this.expenseForm.markAllAsTouched();
            return;
        }

        const { description, amount, date, paidById } = this.expenseForm.getRawValue();
        this.groups.addExpense(this.groupId, {
            description: description.trim(),
            amount: amount!,
            // noon keeps the day stable whatever the time zone
            date: new Date(`${date}T12:00:00`),
            paidById: Number(paidById),
            splitBetweenIds: [...this.splitBetween()],
        });
        this.router.navigate(['/groups', this.groupId]);
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

    splitError(): string {
        return this.submitted() && this.splitBetween().size === 0 ? 'Choose at least one person.' : '';
    }
}
