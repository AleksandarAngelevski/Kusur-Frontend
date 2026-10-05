import { TestBed } from '@angular/core/testing';
import { GroupsService, ME_ID } from './groups.service';

describe('GroupsService', () => {
    let service: GroupsService;

    const summary = (id: number) => service.groups().find((group) => group.id === id)!;

    beforeEach(() => {
        service = TestBed.inject(GroupsService);
    });

    it('should summarise the dummy groups with my balance in each', () => {
        expect(service.groups().map((group) => [group.name, group.memberCount, group.balance])).toEqual([
            ['Ohrid Trip', 4, 1200],
            ['Apartment', 3, -3500],
        ]);
    });

    it('should return undefined for a group that does not exist', () => {
        expect(service.group(999)).toBeUndefined();
    });

    it('should create a group with me as its only member', () => {
        const group = service.createGroup('  Ski weekend  ');

        expect(group.name).toBe('Ski weekend');
        expect(group.members).toEqual([{ id: ME_ID, name: 'You' }]);
        expect(summary(group.id)).toEqual({ id: group.id, name: 'Ski weekend', imageUrl: undefined, memberCount: 1, balance: 0 });
    });

    it('should add a member once and refuse the same name again', () => {
        const group = service.createGroup('Ski weekend');

        expect(service.addMember(group.id, 'Petar')).toBe(true);
        expect(service.addMember(group.id, ' petar ')).toBe(false);
        expect(service.group(group.id)!.members.map((member) => member.name)).toEqual(['You', 'Petar']);
    });

    it('should update my balance when an expense is added', () => {
        const other = service.group(1)!.members.find((member) => member.id !== ME_ID)!;

        service.addExpense(1, { description: 'Dinner', amount: 400, date: new Date(), paidById: other.id, splitBetweenIds: [ME_ID, other.id] });

        expect(summary(1).balance).toBe(1000);
        expect(service.group(1)!.expenses.at(-1)!.description).toBe('Dinner');
    });

    it('should update my balance when a settlement is recorded', () => {
        const other = service.group(1)!.members.find((member) => member.id !== ME_ID)!;

        service.addSettlement(1, { fromId: other.id, toId: ME_ID, amount: 400, date: new Date() });

        expect(summary(1).balance).toBe(800);
    });

    it('should list activity across groups, newest first', () => {
        expect(service.activity().map((entry) => [entry.activity, entry.groupName, entry.amount])).toEqual([
            ['Petar added Boat tickets', 'Ohrid Trip', 800],
            ['You added Fuel and tolls', 'Ohrid Trip', 1600],
            ['Ana added Rent', 'Apartment', 10500],
        ]);
    });

    it('should put a new settlement at the top of the activity', () => {
        service.addSettlement(1, { fromId: 3, toId: ME_ID, amount: 800, date: new Date() });

        expect(service.activity()[0]).toMatchObject({ activity: 'Marija settled up', groupName: 'Ohrid Trip', amount: 800 });
    });

    it('should leave other groups alone', () => {
        service.addExpense(1, { description: 'Dinner', amount: 400, date: new Date(), paidById: ME_ID, splitBetweenIds: [ME_ID] });

        expect(summary(2).balance).toBe(-3500);
    });
});
