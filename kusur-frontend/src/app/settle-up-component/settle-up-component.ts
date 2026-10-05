import { Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { apiErrorMessage } from '../shared/api-error';
import { netBalances, simplifyDebts } from '../shared/balances';
import { wholeNumber } from '../shared/validators';

const differentPeople = (form: AbstractControl): ValidationErrors | null =>
    form.get('fromId')?.value === form.get('toId')?.value ? { samePerson: true } : null;

@Component({
    imports: [ReactiveFormsModule, RouterLink],
    selector: 'app-settle-up-component',
    styleUrl: '../shared/app-form.css',
    templateUrl: './settle-up-component.html',
})
export class SettleUpComponent {
    private groups = inject(GroupsService);
    private router = inject(Router);
    private route = inject(ActivatedRoute).snapshot;
    private groupId = Number(this.route.paramMap.get('id'));

    /** where Back, Cancel and a recorded payment lead: the group, or its admin view when an admin came from there */
    backLink = this.route.data?.['admin'] ? ['/admin/groups', this.groupId] : ['/groups', this.groupId];

    private meId = this.groups.meId();

    group = computed(() => this.groups.group(this.groupId));

    /** start from the payment the group most needs: one of mine if I have any, else the first suggested */
    private suggestion = (() => {
        const group = this.group();
        const debts = group ? simplifyDebts(netBalances(group)) : [];
        return debts.find((debt) => debt.fromId === this.meId || debt.toId === this.meId) ?? debts[0];
    })();

    hasSuggestion = !!this.suggestion;

    settleForm = new FormGroup({
        fromId: new FormControl(this.suggestion?.fromId ?? this.defaultPayerId(), { nonNullable: true }),
        toId: new FormControl(this.suggestion?.toId ?? this.otherMemberId(), { nonNullable: true }),
        amount: new FormControl<number | null>(this.suggestion?.amount ?? null, [
            Validators.required, Validators.min(1), wholeNumber
        ]),
    }, { validators: differentPeople });

    submitting = signal(false);
    errorMessage = signal('');

    onSubmit(){
        if (this.settleForm.invalid) {
            this.settleForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.errorMessage.set('');

        const { fromId, toId, amount } = this.settleForm.getRawValue();
        this.groups.addSettlement(this.groupId, { fromId, toId, amount: amount! }).subscribe({
            next: () => this.router.navigate(this.backLink),
            error: (err) => {
                this.submitting.set(false);
                this.errorMessage.set(apiErrorMessage(err));
            }
        });
    }

    peopleError(): string {
        return this.settleForm.touched && this.settleForm.hasError('samePerson')
            ? 'Pick two different people.'
            : '';
    }

    amountError(): string {
        const amount = this.settleForm.controls.amount;
        if (!amount.touched || amount.valid) return '';
        if (amount.hasError('required')) return 'Enter an amount.';
        return amount.hasError('wholeNumber') ? 'Use whole denars, no decimals.' : 'Enter an amount above zero.';
    }

    /** me when I am in the group; otherwise (an admin recording from outside) its first member */
    private defaultPayerId(): number {
        const members = this.group()?.members ?? [];
        return members.some((member) => member.id === this.meId) ? this.meId : (members[0]?.id ?? this.meId);
    }

    private otherMemberId(): number {
        const payerId = this.defaultPayerId();
        return this.group()?.members.find((member) => member.id !== payerId)?.id ?? payerId;
    }
}
