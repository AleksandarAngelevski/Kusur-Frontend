import { Component, computed, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GroupsService, ME_ID } from '../services/groups.service';
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
    private groupId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

    group = computed(() => this.groups.group(this.groupId));

    /** start from the payment the group most needs: one of mine if I have any, else the first suggested */
    private suggestion = (() => {
        const group = this.group();
        const debts = group ? simplifyDebts(netBalances(group)) : [];
        return debts.find((debt) => debt.fromId === ME_ID || debt.toId === ME_ID) ?? debts[0];
    })();

    hasSuggestion = !!this.suggestion;

    settleForm = new FormGroup({
        fromId: new FormControl(this.suggestion?.fromId ?? ME_ID, { nonNullable: true }),
        toId: new FormControl(this.suggestion?.toId ?? this.otherMemberId(), { nonNullable: true }),
        amount: new FormControl<number | null>(this.suggestion?.amount ?? null, [
            Validators.required, Validators.min(1), wholeNumber
        ]),
    }, { validators: differentPeople });

    onSubmit(){
        if (this.settleForm.invalid) {
            this.settleForm.markAllAsTouched();
            return;
        }

        const { fromId, toId, amount } = this.settleForm.getRawValue();
        this.groups.addSettlement(this.groupId, { fromId, toId, amount: amount!, date: new Date() });
        this.router.navigate(['/groups', this.groupId]);
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

    private otherMemberId(): number {
        return this.group()?.members.find((member) => member.id !== ME_ID)?.id ?? ME_ID;
    }
}
