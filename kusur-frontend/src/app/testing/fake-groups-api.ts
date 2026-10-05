import { HttpErrorResponse } from '@angular/common/http';
import { Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';
import { GroupDetails, Member } from '../models/group.model';
import { AuthService } from '../services/auth.service';
import { CurrentUser, GroupsApi, NewExpense, NewSettlement } from '../services/groups.api';
import { GroupsService } from '../services/groups.service';
import { netBalances } from '../shared/balances';

/** The signed-in user in the fake data. */
export const ME_ID = 1;

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const seed = (): GroupDetails[] => {
    const me: Member = { id: ME_ID, name: 'ace' };
    const petar: Member = { id: 2, name: 'Petar' };
    const marija: Member = { id: 3, name: 'Marija' };
    const nikola: Member = { id: 4, name: 'Nikola' };
    const ana: Member = { id: 5, name: 'Ana' };

    return [
        {
            id: 1,
            name: 'Ohrid Trip',
            ownerId: me.id,
            members: [me, petar, marija, nikola],
            formerMembers: [],
            expenses: [
                { id: 1, description: 'Fuel and tolls', amount: 1600, date: daysAgo(3), paidById: me.id, splitBetweenIds: [1, 2, 3, 4] },
                { id: 2, description: 'Boat tickets', amount: 800, date: daysAgo(2), paidById: petar.id, splitBetweenIds: [2, 3] },
            ],
            settlements: [],
        },
        {
            id: 2,
            name: 'Apartment',
            ownerId: ana.id,
            members: [me, ana, nikola],
            formerMembers: [],
            expenses: [
                { id: 3, description: 'Rent', amount: 10500, date: daysAgo(5), paidById: ana.id, splitBetweenIds: [1, 4, 5] },
            ],
            settlements: [],
        },
    ];
};

const fail = (status: number, message: string) =>
    throwError(() => new HttpErrorResponse({ status, error: { message } }));

/**
 * Stands in for the backend in component and service tests: the same calls as GroupsApi,
 * answered at once from memory, starting from two groups and applying the backend's rules.
 */
export class FakeGroupsApi implements Pick<GroupsApi, keyof GroupsApi> {
    private groups = seed();
    private nextId = 100;

    me(): Observable<CurrentUser> {
        return of({ id: ME_ID, username: 'ace', email: 'ace@example.com' });
    }

    list(): Observable<GroupDetails[]> {
        return of(this.groups);
    }

    create(name: string): Observable<GroupDetails> {
        const group: GroupDetails = {
            id: this.nextId++, name, ownerId: ME_ID, members: [{ id: ME_ID, name: 'ace' }],
            formerMembers: [], expenses: [], settlements: [],
        };
        this.groups = [...this.groups, group];
        return of(group);
    }

    rename(groupId: number, name: string): Observable<GroupDetails> {
        return this.change(groupId, (group) => ({ ...group, name }));
    }

    remove(groupId: number): Observable<void> {
        this.groups = this.groups.filter((group) => group.id !== groupId);
        return of(undefined);
    }

    /** Anyone can be added by name, except "nobody", who does not exist. */
    addMember(groupId: number, identifier: string): Observable<GroupDetails> {
        const group = this.find(groupId);
        const existing = group.members.find((member) => member.name.toLowerCase() === identifier.toLowerCase());
        if (existing) return fail(409, `${existing.name} is already in this group.`);
        if (identifier === 'nobody') return fail(404, 'No user with that username or email.');
        return this.change(groupId, (g) => ({ ...g, members: [...g.members, { id: this.nextId++, name: identifier }] }));
    }

    removeMember(groupId: number, memberId: number): Observable<GroupDetails> {
        const group = this.find(groupId);
        const member = group.members.find((m) => m.id === memberId)!;
        if (memberId === group.ownerId) return fail(409, 'The owner cannot be removed from the group.');
        if ((netBalances(group).get(memberId) ?? 0) !== 0) {
            return fail(409, `${member.name} still owes or is owed money. Settle up first.`);
        }
        return this.change(groupId, (g) => ({
            ...g,
            members: g.members.filter((m) => m.id !== memberId),
            formerMembers: [...g.formerMembers, member],
        }));
    }

    leave(groupId: number): Observable<void> {
        const group = this.find(groupId);
        if (group.ownerId === ME_ID) return fail(409, 'You own this group. Delete it instead of leaving.');
        if ((netBalances(group).get(ME_ID) ?? 0) !== 0) {
            return fail(409, 'Settle your balance in this group before you leave it.');
        }
        return this.remove(groupId);
    }

    addExpense(groupId: number, expense: NewExpense): Observable<GroupDetails> {
        return this.change(groupId, (g) => ({ ...g, expenses: [...g.expenses, { ...expense, id: this.nextId++ }] }));
    }

    updateExpense(groupId: number, expenseId: number, expense: NewExpense): Observable<GroupDetails> {
        return this.change(groupId, (g) => ({
            ...g,
            expenses: g.expenses.map((existing) => (existing.id === expenseId ? { ...expense, id: expenseId } : existing)),
        }));
    }

    deleteExpense(groupId: number, expenseId: number): Observable<GroupDetails> {
        return this.change(groupId, (g) => ({ ...g, expenses: g.expenses.filter((expense) => expense.id !== expenseId) }));
    }

    addSettlement(groupId: number, settlement: NewSettlement): Observable<GroupDetails> {
        return this.change(groupId, (g) => ({
            ...g,
            settlements: [...g.settlements, { ...settlement, id: this.nextId++, date: new Date() }],
        }));
    }

    deleteSettlement(groupId: number, settlementId: number): Observable<GroupDetails> {
        return this.change(groupId, (g) => ({ ...g, settlements: g.settlements.filter((s) => s.id !== settlementId) }));
    }

    private find(groupId: number): GroupDetails {
        return this.groups.find((group) => group.id === groupId)!;
    }

    private change(groupId: number, apply: (group: GroupDetails) => GroupDetails): Observable<GroupDetails> {
        const updated = apply(this.find(groupId));
        this.groups = this.groups.map((group) => (group.id === groupId ? updated : group));
        return of(updated);
    }
}

/** Swaps the backend for the fake in a TestBed. */
export const provideFakeGroupsApi = (): Provider => ({ provide: GroupsApi, useClass: FakeGroupsApi });

/**
 * Signs in and fetches the fake groups into GroupsService, as the route resolver does in the app.
 * Call after configuring the TestBed.
 */
export function loadFakeGroups(): GroupsService {
    TestBed.inject(AuthService).token.set('test.token');
    const service = TestBed.inject(GroupsService);
    service.load().subscribe();
    return service;
}
