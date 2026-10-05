import { computed, Injectable, signal } from '@angular/core';
import { Activity } from '../models/activity.model';
import { Expense, Group, GroupDetails, Member, Settlement } from '../models/group.model';
import { netBalances } from '../shared/balances';

/** The signed-in user's member id in the dummy data. */
export const ME_ID = 1;

/** Dummy-data helper: a Date the given number of days in the past. */
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const seed = (): GroupDetails[] => {
    const you: Member = { id: ME_ID, name: 'You' };
    const petar: Member = { id: 2, name: 'Petar' };
    const marija: Member = { id: 3, name: 'Marija' };
    const nikola: Member = { id: 4, name: 'Nikola' };
    const ana: Member = { id: 5, name: 'Ana' };

    return [
        {
            id: 1,
            name: 'Ohrid Trip',
            members: [you, petar, marija, nikola],
            expenses: [
                { id: 1, description: 'Fuel and tolls', amount: 1600, date: daysAgo(3), paidById: you.id, splitBetweenIds: [1, 2, 3, 4] },
                { id: 2, description: 'Boat tickets', amount: 800, date: daysAgo(2), paidById: petar.id, splitBetweenIds: [2, 3] },
            ],
            settlements: [],
        },
        {
            id: 2,
            name: 'Apartment',
            members: [you, ana, nikola],
            expenses: [
                { id: 3, description: 'Rent', amount: 10500, date: daysAgo(5), paidById: ana.id, splitBetweenIds: [1, 4, 5] },
            ],
            settlements: [],
        },
    ];
};

/**
 * Holds the groups, their expenses and settlements.
 *
 * In-memory stand-in for the groups API: it starts from dummy data and forgets
 * changes on reload. The methods are the seam to swap for HTTP calls once the
 * backend exists; the components only talk to this service.
 */
@Injectable({ providedIn: 'root' })
export class GroupsService {
    private store = signal<GroupDetails[]>(seed());
    private nextId = 100;

    /** Card summaries for lists, with the signed-in user's balance in each group. */
    groups = computed<Group[]>(() =>
        this.store().map((group) => ({
            id: group.id,
            name: group.name,
            imageUrl: group.imageUrl,
            memberCount: group.members.length,
            balance: netBalances(group).get(ME_ID) ?? 0,
        }))
    );

    /** Every expense and settlement across my groups, newest first, for the activity feed. */
    activity = computed<Activity[]>(() =>
        this.store()
            .flatMap((group) => {
                const name = (id: number) => group.members.find((member) => member.id === id)?.name ?? 'Someone';
                return [
                    ...group.expenses.map((expense): Activity => ({
                        id: expense.id,
                        // nobody records who typed an expense in, so it is credited to whoever paid
                        activity: `${name(expense.paidById)} added ${expense.description}`,
                        groupName: group.name,
                        timestamp: expense.date,
                        amount: expense.amount,
                    })),
                    ...group.settlements.map((settlement): Activity => ({
                        id: settlement.id,
                        activity: `${name(settlement.fromId)} settled up`,
                        groupName: group.name,
                        timestamp: settlement.date,
                        amount: settlement.amount,
                    })),
                ];
            })
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime() || b.id - a.id)
    );

    /** Reads the store, so it stays reactive when called inside a computed or a template. */
    group(id: number): GroupDetails | undefined {
        return this.store().find((group) => group.id === id);
    }

    /** The creator is the group's first member. */
    createGroup(name: string): GroupDetails {
        const group: GroupDetails = {
            id: this.nextId++,
            name: name.trim(),
            members: [{ id: ME_ID, name: 'You' }],
            expenses: [],
            settlements: [],
        };
        this.store.update((groups) => [...groups, group]);
        return group;
    }

    /** Returns false, and adds nobody, when the group already has a member with that name. */
    addMember(groupId: number, name: string): boolean {
        const trimmed = name.trim();
        const group = this.group(groupId);
        if (!group || group.members.some((member) => member.name.toLowerCase() === trimmed.toLowerCase())) {
            return false;
        }
        this.change(groupId, (g) => ({ ...g, members: [...g.members, { id: this.nextId++, name: trimmed }] }));
        return true;
    }

    addExpense(groupId: number, expense: Omit<Expense, 'id'>): void {
        this.change(groupId, (g) => ({ ...g, expenses: [...g.expenses, { ...expense, id: this.nextId++ }] }));
    }

    addSettlement(groupId: number, settlement: Omit<Settlement, 'id'>): void {
        this.change(groupId, (g) => ({ ...g, settlements: [...g.settlements, { ...settlement, id: this.nextId++ }] }));
    }

    private change(groupId: number, apply: (group: GroupDetails) => GroupDetails): void {
        this.store.update((groups) => groups.map((group) => (group.id === groupId ? apply(group) : group)));
    }
}
