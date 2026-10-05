import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GroupsService, memberName } from '../services/groups.service';
import { apiErrorMessage } from '../shared/api-error';
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
    /** set on settlements, which can be undone from their row */
    settlementId?: number;
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

    protected readonly initials = initials;
    private meId = this.groups.meId;

    group = computed(() => this.groups.group(Number(this.params()?.get('id'))));

    private net = computed(() => {
        const group = this.group();
        return group ? netBalances(group) : new Map<number, number>();
    });

    myBalance = computed(() => this.net().get(this.meId()) ?? 0);

    memberBalances = computed(() =>
        (this.group()?.members ?? []).map((member) => ({ member, balance: this.net().get(member.id) ?? 0 }))
    );

    /** the fewest payments that settle the group, worded for display */
    payments = computed(() =>
        simplifyDebts(this.net()).map((debt) => ({
            ...debt,
            text: debt.fromId === this.meId()
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
            myShare: expenseShares(expense).get(this.meId()),
            link: ['/groups', group.id, 'expenses', expense.id, 'edit'],
        }));
        const settlements = group.settlements.map((settlement): HistoryEntry => ({
            key: `settlement-${settlement.id}`,
            date: settlement.date,
            title: `${this.name(settlement.fromId)} paid ${this.name(settlement.toId, 'you')}`,
            detail: 'Settlement',
            amount: settlement.amount,
            settlementId: settlement.id,
        }));

        return [...expenses, ...settlements].sort(
            (a, b) => b.date.getTime() - a.date.getTime() || b.key.localeCompare(a.key)
        );
    });

    /** the settlement whose Undo is waiting for its second click */
    confirmingUndo = signal<number | null>(null);

    undoError = signal('');

    undoSettlement(settlementId: number){
        const group = this.group();
        if (!group) return;
        this.undoError.set('');
        this.groups.deleteSettlement(group.id, settlementId).subscribe({
            next: () => this.confirmingUndo.set(null),
            error: (err) => this.undoError.set(apiErrorMessage(err)),
        });
    }

    memberForm = new FormGroup({ name: new FormControl('', { nonNullable: true }) });
    memberError = signal('');

    addMember(){
        const group = this.group();
        const name = this.memberForm.controls.name.value.trim();
        if (!group) return;

        if (!name) {
            this.memberError.set('Enter a username or email.');
            return;
        }
        this.memberError.set('');
        // the backend says when nobody has that username or email, or they are already in the group
        this.groups.addMember(group.id, name).subscribe({
            next: () => this.memberForm.reset(),
            error: (err) => this.memberError.set(apiErrorMessage(err)),
        });
    }

    /** "You" for the signed-in user (or the given wording mid-sentence), the member's name otherwise. */
    private name(id: number, me = 'You'): string {
        if (id === this.meId()) return me;
        const group = this.group();
        return group ? memberName(group, id) : 'Someone';
    }
}
