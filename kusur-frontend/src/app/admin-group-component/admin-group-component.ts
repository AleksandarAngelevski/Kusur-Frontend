import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GroupsService, memberName } from '../services/groups.service';
import { apiErrorMessage } from '../shared/api-error';

/**
 * Admin-only view of any group: its members, its expenses (each opens for editing) and its settlements.
 * The admin can add an expense or a settlement here without being a member.
 */
@Component({
    imports: [DatePipe, DecimalPipe, RouterLink],
    selector: 'app-admin-group-component',
    styleUrl: './admin-group-component.css',
    templateUrl: './admin-group-component.html',
})
export class AdminGroupComponent {
    private groups = inject(GroupsService);
    private groupId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

    group = computed(() => this.groups.allGroups().find((group) => group.id === this.groupId));

    owner = computed(() => {
        const group = this.group();
        return group ? memberName(group, group.ownerId) : '';
    });

    /** newest first, with the payer's name */
    expenses = computed(() => {
        const group = this.group();
        if (!group) return [];
        return [...group.expenses]
            .sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id)
            .map((expense) => ({ ...expense, paidBy: memberName(group, expense.paidById) }));
    });

    /** newest first, worded like the group's own history */
    settlements = computed(() => {
        const group = this.group();
        if (!group) return [];
        return [...group.settlements]
            .sort((a, b) => b.date.getTime() - a.date.getTime() || b.id - a.id)
            .map((settlement) => ({
                ...settlement,
                text: `${memberName(group, settlement.fromId)} paid ${memberName(group, settlement.toId)}`,
            }));
    });

    /** the settlement whose Undo is waiting for its second click */
    confirmingUndo = signal<number | null>(null);
    errorMessage = signal('');

    undoSettlement(settlementId: number){
        this.errorMessage.set('');
        this.groups.deleteSettlement(this.groupId, settlementId).subscribe({
            next: () => this.confirmingUndo.set(null),
            error: (err) => {
                this.confirmingUndo.set(null);
                this.errorMessage.set(apiErrorMessage(err));
            }
        });
    }
}
