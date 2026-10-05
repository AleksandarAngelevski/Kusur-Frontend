import { computed, Injectable, signal } from '@angular/core';
import { Activity } from '../models/activity.model';
import { Expense, Group, GroupDetails, Member, Settlement } from '../models/group.model';
import { netBalances } from '../shared/balances';

/** The signed-in user's member id in the dummy data. */
export const ME_ID = 1;

/** A member's name, including people who have since left the group. */
export const memberName = (group: GroupDetails, id: number): string =>
    [...group.members, ...group.formerMembers].find((member) => member.id === id)?.name ?? 'Someone';

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
            ownerId: you.id,
            members: [you, petar, marija, nikola],
            formerMembers: [],
            expenses: [
                { id: 1, description: 'Fuel and tolls', amount: 1600, date: daysAgo(3), paidById: you.id, splitBetweenIds: [1, 2, 3, 4] },
                { id: 2, description: 'Boat tickets', amount: 800, date: daysAgo(2), paidById: petar.id, splitBetweenIds: [2, 3] },
            ],
            settlements: [],
        },
        {
            id: 2,
            name: 'Apartment',
            ownerId: ana.id,
            members: [you, ana, nikola],
            formerMembers: [],
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
                const name = (id: number) => memberName(group, id);
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

    /** The creator owns the group and is its first member. */
    createGroup(name: string): GroupDetails {
        const group: GroupDetails = {
            id: this.nextId++,
            name: name.trim(),
            ownerId: ME_ID,
            members: [{ id: ME_ID, name: 'You' }],
            formerMembers: [],
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

    renameGroup(groupId: number, name: string): void {
        this.change(groupId, (g) => ({ ...g, name: name.trim() }));
    }

    deleteGroup(groupId: number): void {
        this.store.update((groups) => groups.filter((group) => group.id !== groupId));
    }

    /**
     * Removes a member who is settled up, keeping their name for the history.
     * Returns false, and removes nobody, for the owner or for anyone who still owes or is owed money.
     */
    removeMember(groupId: number, memberId: number): boolean {
        const group = this.group(groupId);
        const member = group?.members.find((m) => m.id === memberId);
        if (!group || !member || memberId === group.ownerId || (netBalances(group).get(memberId) ?? 0) !== 0) {
            return false;
        }
        this.change(groupId, (g) => ({
            ...g,
            members: g.members.filter((m) => m.id !== memberId),
            formerMembers: [...g.formerMembers, member],
        }));
        return true;
    }

    /**
     * Takes me out of a group, which drops it from my list. Returns false when I own it
     * (delete it instead) or am not settled up.
     */
    leaveGroup(groupId: number): boolean {
        const group = this.group(groupId);
        if (!group || group.ownerId === ME_ID || (netBalances(group).get(ME_ID) ?? 0) !== 0) {
            return false;
        }
        this.deleteGroup(groupId);
        return true;
    }

    addExpense(groupId: number, expense: Omit<Expense, 'id'>): void {
        this.change(groupId, (g) => ({ ...g, expenses: [...g.expenses, { ...expense, id: this.nextId++ }] }));
    }

    updateExpense(groupId: number, expenseId: number, expense: Omit<Expense, 'id'>): void {
        this.change(groupId, (g) => ({
            ...g,
            expenses: g.expenses.map((existing) => (existing.id === expenseId ? { ...expense, id: expenseId } : existing)),
        }));
    }

    deleteExpense(groupId: number, expenseId: number): void {
        this.change(groupId, (g) => ({ ...g, expenses: g.expenses.filter((expense) => expense.id !== expenseId) }));
    }

    addSettlement(groupId: number, settlement: Omit<Settlement, 'id'>): void {
        this.change(groupId, (g) => ({ ...g, settlements: [...g.settlements, { ...settlement, id: this.nextId++ }] }));
    }

    /** Takes a recorded payment back out, which restores the balances from before it. */
    deleteSettlement(groupId: number, settlementId: number): void {
        this.change(groupId, (g) => ({ ...g, settlements: g.settlements.filter((settlement) => settlement.id !== settlementId) }));
    }

    private change(groupId: number, apply: (group: GroupDetails) => GroupDetails): void {
        this.store.update((groups) => groups.map((group) => (group.id === groupId ? apply(group) : group)));
    }
}
