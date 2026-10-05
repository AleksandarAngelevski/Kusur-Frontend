import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Expense, GroupDetails, Member, Settlement } from '../models/group.model';

export type Role = 'USER' | 'ADMIN';

/** The signed-in user, as GET /api/users/me returns it. */
export interface CurrentUser {
    id: number;
    username: string;
    email: string;
    role: Role;
}

/** A group as the backend sends it: the same as GroupDetails, but with dates as strings and null for "no custom shares". */
interface GroupWire extends Omit<GroupDetails, 'expenses' | 'settlements'> {
    expenses: (Omit<Expense, 'date' | 'customShares'> & { date: string; customShares: Expense['customShares'] | null })[];
    settlements: (Omit<Settlement, 'date'> & { date: string })[];
}

export type NewExpense = Omit<Expense, 'id'>;
export type NewSettlement = Pick<Settlement, 'fromId' | 'toId' | 'amount'>;

/** a date as yyyy-MM-dd in local time, which is how the backend stores an expense's day */
const toWireDate = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const fromWire = (group: GroupWire): GroupDetails => ({
    ...group,
    expenses: group.expenses.map((expense) => ({
        ...expense,
        // noon keeps the day stable whatever the time zone
        date: new Date(`${expense.date}T12:00:00`),
        customShares: expense.customShares ?? undefined,
    })),
    settlements: group.settlements.map((settlement) => ({ ...settlement, date: new Date(settlement.date) })),
});

const toWire = (expense: NewExpense) => ({
    description: expense.description,
    amount: expense.amount,
    date: toWireDate(expense.date),
    paidById: expense.paidById,
    splitBetweenIds: expense.splitBetweenIds,
    customShares: expense.customShares ?? null,
});

/**
 * The backend's groups endpoints. Every call that changes a group answers with the
 * whole updated group. GroupsService is the only caller; components go through it.
 */
@Injectable({ providedIn: 'root' })
export class GroupsApi {
    private http = inject(HttpClient);

    me(): Observable<CurrentUser> {
        return this.http.get<CurrentUser>('/api/users/me');
    }

    list(): Observable<GroupDetails[]> {
        return this.http.get<GroupWire[]>('/api/groups').pipe(map((groups) => groups.map(fromWire)));
    }

    create(name: string): Observable<GroupDetails> {
        return this.http.post<GroupWire>('/api/groups', { name }).pipe(map(fromWire));
    }

    rename(groupId: number, name: string): Observable<GroupDetails> {
        return this.http.patch<GroupWire>(`/api/groups/${groupId}`, { name }).pipe(map(fromWire));
    }

    /** hands the group to another of its members; only the current owner may */
    transferOwnership(groupId: number, ownerId: Member['id']): Observable<GroupDetails> {
        return this.http.put<GroupWire>(`/api/groups/${groupId}/owner`, { ownerId }).pipe(map(fromWire));
    }

    remove(groupId: number): Observable<void> {
        return this.http.delete<void>(`/api/groups/${groupId}`);
    }

    /** identifier is the person's username or email */
    addMember(groupId: number, identifier: string): Observable<GroupDetails> {
        return this.http.post<GroupWire>(`/api/groups/${groupId}/members`, { identifier }).pipe(map(fromWire));
    }

    removeMember(groupId: number, memberId: Member['id']): Observable<GroupDetails> {
        return this.http.delete<GroupWire>(`/api/groups/${groupId}/members/${memberId}`).pipe(map(fromWire));
    }

    leave(groupId: number): Observable<void> {
        return this.http.delete<void>(`/api/groups/${groupId}/members/me`);
    }

    addExpense(groupId: number, expense: NewExpense): Observable<GroupDetails> {
        return this.http.post<GroupWire>(`/api/groups/${groupId}/expenses`, toWire(expense)).pipe(map(fromWire));
    }

    updateExpense(groupId: number, expenseId: number, expense: NewExpense): Observable<GroupDetails> {
        return this.http.put<GroupWire>(`/api/groups/${groupId}/expenses/${expenseId}`, toWire(expense)).pipe(map(fromWire));
    }

    deleteExpense(groupId: number, expenseId: number): Observable<GroupDetails> {
        return this.http.delete<GroupWire>(`/api/groups/${groupId}/expenses/${expenseId}`).pipe(map(fromWire));
    }

    addSettlement(groupId: number, settlement: NewSettlement): Observable<GroupDetails> {
        return this.http.post<GroupWire>(`/api/groups/${groupId}/settlements`, settlement).pipe(map(fromWire));
    }

    deleteSettlement(groupId: number, settlementId: number): Observable<GroupDetails> {
        return this.http.delete<GroupWire>(`/api/groups/${groupId}/settlements/${settlementId}`).pipe(map(fromWire));
    }
}
