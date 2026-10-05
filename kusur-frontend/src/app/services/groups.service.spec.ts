import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { GroupDetails } from '../models/group.model';
import { loadFakeGroups, ME_ID, provideFakeGroupsApi } from '../testing/fake-groups-api';
import { AdminApi } from './admin.api';
import { AuthService } from './auth.service';
import { GroupsApi } from './groups.api';
import { GroupsService } from './groups.service';

describe('GroupsService', () => {
    let service: GroupsService;

    const summary = (id: number) => service.groups().find((group) => group.id === id)!;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideFakeGroupsApi()] });
        service = loadFakeGroups();
    });

    it('should know who I am once loaded, and call me "You"', () => {
        expect(service.meId()).toBe(ME_ID);
        expect(service.group(1)!.members.map((member) => member.name)).toEqual(['You', 'Petar', 'Marija', 'Nikola']);
    });

    it('should summarise the groups with my balance in each', () => {
        expect(service.groups().map((group) => [group.name, group.memberCount, group.balance])).toEqual([
            ['Ohrid Trip', 4, 1200],
            ['Apartment', 3, -3500],
        ]);
    });

    it('should return undefined for a group that does not exist', () => {
        expect(service.group(999)).toBeUndefined();
    });

    it('should add a created group to the list and hand it back', () => {
        let created: GroupDetails | undefined;
        service.createGroup('  Ski weekend  ').subscribe((group) => (created = group));

        expect(created).toMatchObject({ name: 'Ski weekend', ownerId: ME_ID, members: [{ id: ME_ID, name: 'You' }] });
        expect(summary(created!.id)).toMatchObject({ name: 'Ski weekend', memberCount: 1, balance: 0 });
    });

    it('should replace a group with the backend\'s answer after a change', () => {
        const other = service.group(1)!.members.find((member) => member.id !== ME_ID)!;

        service.addExpense(1, { description: 'Dinner', amount: 400, date: new Date(), paidById: other.id, splitBetweenIds: [ME_ID, other.id] }).subscribe();
        expect(summary(1).balance).toBe(1000);

        service.addSettlement(1, { fromId: other.id, toId: ME_ID, amount: 400 }).subscribe();
        expect(summary(1).balance).toBe(600);

        service.deleteSettlement(1, service.group(1)!.settlements[0].id).subscribe();
        expect(summary(1).balance).toBe(1000);

        service.renameGroup(1, ' Ohrid 2026 ').subscribe();
        expect(summary(1).name).toBe('Ohrid 2026');
        expect(summary(2).balance).toBe(-3500);
    });

    it('should update and delete an expense in place', () => {
        const [fuel] = service.group(1)!.expenses;

        service.updateExpense(1, fuel.id, { ...fuel, amount: 2000 }).subscribe();
        expect(summary(1).balance).toBe(1500);

        service.deleteExpense(1, fuel.id).subscribe();
        expect(summary(1).balance).toBe(0);
        expect(service.group(1)!.expenses.map((expense) => expense.description)).toEqual(['Boat tickets']);
    });

    it('should drop a group from the list when it is deleted', () => {
        service.deleteGroup(1).subscribe();

        expect(service.groups().map((group) => group.name)).toEqual(['Apartment']);
    });

    it('should keep the group and pass the error on when the backend refuses a change', () => {
        let error: HttpErrorResponse | undefined;
        service.leaveGroup(2).subscribe({ error: (err) => (error = err) });

        expect(error?.error.message).toBe('Settle your balance in this group before you leave it.');
        expect(service.groups().length).toBe(2);

        service.removeMember(1, 3).subscribe({ error: (err) => (error = err) });
        expect(error?.error.message).toBe('Marija still owes or is owed money. Settle up first.');
        expect(service.group(1)!.members.length).toBe(4);
    });

    it('should keep a removed member\'s name for the history', () => {
        service.removeMember(1, 2).subscribe();

        expect(service.group(1)!.members.map((member) => member.name)).toEqual(['You', 'Marija', 'Nikola']);
        expect(service.activity().some((entry) => entry.activity === 'Petar added Boat tickets')).toBe(true);
    });

    it('should list activity across groups, newest first', () => {
        expect(service.activity().map((entry) => [entry.activity, entry.groupName, entry.amount])).toEqual([
            ['Petar added Boat tickets', 'Ohrid Trip', 800],
            ['You added Fuel and tolls', 'Ohrid Trip', 1600],
            ['Ana added Rent', 'Apartment', 10500],
        ]);
    });

    it('should put a new settlement at the top of the activity', () => {
        service.addSettlement(1, { fromId: 3, toId: ME_ID, amount: 800 }).subscribe();

        expect(service.activity()[0]).toMatchObject({ activity: 'Marija settled up', groupName: 'Ohrid Trip', amount: 800 });
    });

    it('should find a group from the admin copy, and keep that copy up to date', () => {
        const outsider: GroupDetails = { id: 50, name: 'Not mine', ownerId: 9, members: [{ id: 9, name: 'stefan' }], formerMembers: [], expenses: [], settlements: [] };
        vi.spyOn(TestBed.inject(AdminApi), 'groups').mockReturnValue(of([outsider, service.group(1)!]));
        expect(service.group(50)).toBeUndefined();

        service.loadAllGroups().subscribe();
        expect(service.group(50)!.name).toBe('Not mine');
        expect(service.groups().some((group) => group.id === 50)).toBe(false);

        service.renameGroup(1, 'Ohrid 2026').subscribe();
        expect(service.allGroups().find((group) => group.id === 1)!.name).toBe('Ohrid 2026');

        TestBed.inject(AuthService).logout();
        TestBed.tick();
        expect(service.allGroups()).toEqual([]);
    });

    it('should only fetch once, until someone signs out', () => {
        const list = vi.spyOn(TestBed.inject(GroupsApi), 'list');

        service.ensureLoaded().subscribe();
        expect(list).not.toHaveBeenCalled();

        TestBed.inject(AuthService).logout();
        TestBed.tick();
        expect(service.groups()).toEqual([]);
        expect(service.meId()).toBe(-1);

        service.ensureLoaded().subscribe();
        expect(list).toHaveBeenCalledTimes(1);
        expect(service.groups().length).toBe(2);
    });

    it('should report a failed load without failing, and recover on retry', () => {
        TestBed.inject(AuthService).logout();
        TestBed.tick();
        const list = vi.spyOn(TestBed.inject(GroupsApi), 'list')
            .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 502 })));

        let completed = false;
        service.ensureLoaded().subscribe({ complete: () => (completed = true) });
        expect(completed).toBe(true);
        expect(service.loadError()).toBe("Can't reach the server. Try again in a moment.");
        expect(service.groups()).toEqual([]);

        service.load().subscribe();
        expect(list).toHaveBeenCalledTimes(2);
        expect(service.loadError()).toBe('');
        expect(service.groups().length).toBe(2);
    });
});
