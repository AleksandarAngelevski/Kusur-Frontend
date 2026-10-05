import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GroupsService, ME_ID, memberName } from '../services/groups.service';
import { expenseShares, netBalances, simplifyDebts } from '../shared/balances';
import { initials } from '../shared/initials';

/** One line of the group's history: an expense or a settlement. */
interface HistoryEntry {
    key: string;
    date: Date;
    title: string;
    detail: string;
    amount: number;
    /** what the signed-in user owes for an expense they are part of */
    myShare?: number;
    /** where the row leads; expenses open their edit page */
    link?: (string | number)[];
}

@Component({
    imports: [DatePipe, DecimalPipe, NgTemplateOutlet, ReactiveFormsModule, RouterLink],
    selector: 'app-group-details-component',
    styleUrl: './group-details-component.css',
    templateUrl: './group-details-component.html',
})
export class GroupDetailsComponent {
    private groups = inject(GroupsService);
    private params = toSignal(inject(ActivatedRoute).paramMap);

    protected readonly meId = ME_ID;
    protected readonly initials = initials;

    group = computed(() => this.groups.group(Number(this.params()?.get('id'))));

    private net = computed(() => {
        const group = this.group();
        return group ? netBalances(group) : new Map<number, number>();
    });

    myBalance = computed(() => this.net().get(ME_ID) ?? 0);

    memberBalances = computed(() =>
        (this.group()?.members ?? []).map((member) => ({ member, balance: this.net().get(member.id) ?? 0 }))
    );

    /** the fewest payments that settle the group, worded for display */
    payments = computed(() =>
        simplifyDebts(this.net()).map((debt) => ({
            ...debt,
            text: debt.fromId === ME_ID
                ? `You pay ${this.name(debt.toId)}`
                : `${this.name(debt.fromId)} pays ${this.name(debt.toId, 'you')}`,
        }))
    );

    /** expenses and settlements together, newest first */
    history = computed<HistoryEntry[]>(() => {
        const group = this.group();
        if (!group) return [];

        const expenses = group.expenses.map((expense): HistoryEntry => ({
            key: `expense-${expense.id}`,
            date: expense.date,
            title: expense.description,
            detail: `${this.name(expense.paidById)} paid`,
            amount: expense.amount,
            myShare: expenseShares(expense).get(ME_ID),
            link: ['/groups', group.id, 'expenses', expense.id, 'edit'],
        }));
        const settlements = group.settlements.map((settlement): HistoryEntry => ({
            key: `settlement-${settlement.id}`,
            date: settlement.date,
            title: `${this.name(settlement.fromId)} paid ${this.name(settlement.toId, 'you')}`,
            detail: 'Settlement',
            amount: settlement.amount,
        }));

        return [...expenses, ...settlements].sort(
            (a, b) => b.date.getTime() - a.date.getTime() || b.key.localeCompare(a.key)
        );
    });

    memberForm = new FormGroup({ name: new FormControl('', { nonNullable: true }) });
    memberError = signal('');

    addMember(){
        const group = this.group();
        const name = this.memberForm.controls.name.value.trim();
        if (!group) return;

        if (!name) {
            this.memberError.set('Enter a name.');
            return;
        }
        if (!this.groups.addMember(group.id, name)) {
            this.memberError.set(`${name} is already in this group.`);
            return;
        }
        this.memberError.set('');
        this.memberForm.reset();
    }

    /** "You" for the signed-in user (or the given wording mid-sentence), the member's name otherwise. */
    private name(id: number, me = 'You'): string {
        if (id === ME_ID) return me;
        const group = this.group();
        return group ? memberName(group, id) : 'Someone';
    }
}
