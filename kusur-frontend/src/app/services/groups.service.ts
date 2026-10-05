import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, tap } from 'rxjs';
import { Activity } from '../models/activity.model';
import { Group, GroupDetails } from '../models/group.model';
import { apiErrorMessage } from '../shared/api-error';
import { netBalances } from '../shared/balances';
import { AdminApi } from './admin.api';
import { AuthService } from './auth.service';
import { CurrentUser, GroupsApi, NewExpense, NewSettlement } from './groups.api';

/** A member's name, including people who have since left the group. */
export const memberName = (group: GroupDetails, id: number): string =>
    [...group.members, ...group.formerMembers].find((member) => member.id === id)?.name ?? 'Someone';

/**
 * The signed-in user's groups, with their members, expenses and settlements.
 *
 * Keeps a copy of what the backend holds: load() fetches it once per sign-in, and every
 * change goes to the backend first and then replaces the group here with the answer.
 * Components read the signals synchronously and subscribe to the changes they start.
 */
@Injectable({ providedIn: 'root' })
export class GroupsService {
    private api = inject(GroupsApi);
    private auth = inject(AuthService);

    private adminApi = inject(AdminApi);

    private store = signal<GroupDetails[]>([]);
    /** every group there is, fetched for admins by loadAllGroups(); empty for everyone else */
    private adminStore = signal<GroupDetails[]>([]);
    private me = signal<CurrentUser | null>(null);
    private loaded = false;

    /** set when the groups could not be fetched; the shell shows it with a retry */
    loadError = signal('');

    /** every group, including ones the signed-in admin is not in */
    allGroups = this.adminStore.asReadonly();

    /** who is signed in, once loaded */
    currentUser = this.me.asReadonly();

    /** the signed-in user's member id; matches nobody until the groups have loaded */
    meId = computed(() => this.me()?.id ?? -1);

    /** admins get the Admin page and its nav link; the backend enforces the role on every admin call */
    isAdmin = computed(() => this.me()?.role === 'ADMIN');

    /** Card summaries for lists, with the signed-in user's balance in each group. */
    groups = computed<Group[]>(() =>
        this.store().map((group) => ({
            id: group.id,
            name: group.name,
            imageUrl: group.imageUrl,
            memberCount: group.members.length,
            balance: netBalances(group).get(this.meId()) ?? 0,
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
                        // expenses and settlements number separately on the backend, so keep their ids apart
                        id: -settlement.id,
                        activity: `${name(settlement.fromId)} settled up`,
                        groupName: group.name,
                        timestamp: settlement.date,
                        amount: settlement.amount,
                    })),
                ];
            })
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime() || b.id - a.id)
    );

    constructor() {
        // signing out drops the copy, so the next person to sign in starts from their own data
        effect(() => {
            if (!this.auth.isLoggedIn()) this.reset();
        });
    }

    /** Fetches the groups unless they are already here. Never fails: a problem lands in loadError instead. */
    ensureLoaded(): Observable<void> {
        return this.loaded ? of(undefined) : this.load();
    }

    load(): Observable<void> {
        this.loadError.set('');
        return forkJoin([this.api.me(), this.api.list()]).pipe(
            tap(([me, groups]) => {
                this.me.set(me);
                this.store.set(groups.map((group) => this.adopt(group)));
                this.loaded = true;
            }),
            map(() => undefined),
            catchError((err) => {
                this.loadError.set(apiErrorMessage(err, "Couldn't load your groups."));
                return of(undefined);
            })
        );
    }

    /**
     * Fetches every group, for the admin pages. Refetched on each visit, since other people change them.
     * Never fails: a problem lands in loadError instead.
     */
    loadAllGroups(): Observable<void> {
        return this.adminApi.groups().pipe(
            tap((groups) => this.adminStore.set(groups.map((group) => this.adopt(group)))),
            map(() => undefined),
            catchError((err) => {
                this.loadError.set(apiErrorMessage(err, "Couldn't load the groups."));
                return of(undefined);
            })
        );
    }

    /**
     * One of my groups, or for an admin any group that loadAllGroups() fetched.
     * Reads the stores, so it stays reactive when called inside a computed or a template.
     */
    group(id: number): GroupDetails | undefined {
        return this.store().find((group) => group.id === id) ?? this.adminStore().find((group) => group.id === id);
    }

    /** The creator owns the group and is its first member. */
    createGroup(name: string): Observable<GroupDetails> {
        return this.api.create(name.trim()).pipe(
            map((group) => this.adopt(group)),
            tap((group) => this.store.update((groups) => [...groups, group]))
        );
    }

    renameGroup(groupId: number, name: string): Observable<GroupDetails> {
        return this.replace(this.api.rename(groupId, name.trim()));
    }

    /** Hands the group to another member. Afterwards I am an ordinary member of it. */
    transferOwnership(groupId: number, ownerId: number): Observable<GroupDetails> {
        return this.replace(this.api.transferOwnership(groupId, ownerId));
    }

    deleteGroup(groupId: number): Observable<void> {
        return this.api.remove(groupId).pipe(tap(() => this.forget(groupId)));
    }

    /** identifier is the person's username or email; fails with the backend's message if nobody matches */
    addMember(groupId: number, identifier: string): Observable<GroupDetails> {
        return this.replace(this.api.addMember(groupId, identifier.trim()));
    }

    /** The backend refuses the owner and anyone who still owes or is owed money. */
    removeMember(groupId: number, memberId: number): Observable<GroupDetails> {
        return this.replace(this.api.removeMember(groupId, memberId));
    }

    /** Takes me out of a group, which drops it from my list. Refused when I own it or am not settled up. */
    leaveGroup(groupId: number): Observable<void> {
        return this.api.leave(groupId).pipe(tap(() => this.forget(groupId)));
    }

    addExpense(groupId: number, expense: NewExpense): Observable<GroupDetails> {
        return this.replace(this.api.addExpense(groupId, expense));
    }

    updateExpense(groupId: number, expenseId: number, expense: NewExpense): Observable<GroupDetails> {
        return this.replace(this.api.updateExpense(groupId, expenseId, expense));
    }

    deleteExpense(groupId: number, expenseId: number): Observable<GroupDetails> {
        return this.replace(this.api.deleteExpense(groupId, expenseId));
    }

    addSettlement(groupId: number, settlement: NewSettlement): Observable<GroupDetails> {
        return this.replace(this.api.addSettlement(groupId, settlement));
    }

    /** Takes a recorded payment back out, which restores the balances from before it. */
    deleteSettlement(groupId: number, settlementId: number): Observable<GroupDetails> {
        return this.replace(this.api.deleteSettlement(groupId, settlementId));
    }

    /** Swaps the stored group for the backend's updated one. */
    private replace(change: Observable<GroupDetails>): Observable<GroupDetails> {
        return change.pipe(
            map((group) => this.adopt(group)),
            tap((updated) => {
                const swap = (groups: GroupDetails[]) => groups.map((group) => (group.id === updated.id ? updated : group));
                this.store.update(swap);
                this.adminStore.update(swap);
            })
        );
    }

    private forget(groupId: number): void {
        this.store.update((groups) => groups.filter((group) => group.id !== groupId));
    }

    /** The backend names members by username; the signed-in user reads as "You" everywhere in the app. */
    private adopt(group: GroupDetails): GroupDetails {
        const meId = this.meId();
        return {
            ...group,
            members: group.members.map((member) => (member.id === meId ? { ...member, name: 'You' } : member)),
        };
    }

    private reset(): void {
        this.store.set([]);
        this.adminStore.set([]);
        this.me.set(null);
        this.loaded = false;
        this.loadError.set('');
    }
}
