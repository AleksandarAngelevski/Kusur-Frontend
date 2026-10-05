import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GroupsService, memberName } from '../services/groups.service';

/** Admin-only view of any group: its members and its expenses, each of which the admin can open and edit. */
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
}
