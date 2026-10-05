import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GroupDetails } from '../models/group.model';
import { GroupsApi } from './groups.api';

/** A group as the backend sends it. */
const wireGroup = {
    id: 7,
    name: 'Ohrid Trip',
    ownerId: 2,
    members: [{ id: 2, name: 'ace' }, { id: 3, name: 'petar' }],
    formerMembers: [],
    expenses: [
        { id: 1, description: 'Fuel', amount: 1600.0, date: '2026-09-30', paidById: 2, splitBetweenIds: [2, 3], customShares: null },
        { id: 2, description: 'Dinner', amount: 1000, date: '2026-10-01', paidById: 3, splitBetweenIds: [2, 3],
          customShares: [{ memberId: 2, amount: 250 }, { memberId: 3, amount: 750 }] },
    ],
    settlements: [{ id: 5, fromId: 3, toId: 2, amount: 400, date: '2026-10-02T09:30:00Z' }],
};

describe('GroupsApi', () => {
    let api: GroupsApi;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        api = TestBed.inject(GroupsApi);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should turn the backend\'s dates into Dates and null custom shares into none', () => {
        let groups: GroupDetails[] = [];
        api.list().subscribe((result) => (groups = result));
        http.expectOne({ method: 'GET', url: '/api/groups' }).flush([wireGroup]);

        const [fuel, dinner] = groups[0].expenses;
        expect([fuel.date.getFullYear(), fuel.date.getMonth() + 1, fuel.date.getDate()]).toEqual([2026, 9, 30]);
        expect(fuel.customShares).toBeUndefined();
        expect(dinner.customShares).toEqual([{ memberId: 2, amount: 250 }, { memberId: 3, amount: 750 }]);
        expect(groups[0].settlements[0].date.toISOString()).toBe('2026-10-02T09:30:00.000Z');
    });

    it('should send an expense with its day as yyyy-MM-dd', () => {
        api.addExpense(7, { description: 'Fuel', amount: 1600, date: new Date(2026, 8, 30, 12), paidById: 2, splitBetweenIds: [2, 3] }).subscribe();

        const req = http.expectOne({ method: 'POST', url: '/api/groups/7/expenses' });
        expect(req.request.body).toEqual({
            description: 'Fuel', amount: 1600, date: '2026-09-30', paidById: 2, splitBetweenIds: [2, 3], customShares: null,
        });
        req.flush(wireGroup);
    });

    it('should send custom shares when the expense has them', () => {
        const customShares = [{ memberId: 2, amount: 250 }, { memberId: 3, amount: 750 }];
        api.updateExpense(7, 2, { description: 'Dinner', amount: 1000, date: new Date(2026, 9, 1, 12), paidById: 3, splitBetweenIds: [2, 3], customShares }).subscribe();

        const req = http.expectOne({ method: 'PUT', url: '/api/groups/7/expenses/2' });
        expect(req.request.body.customShares).toEqual(customShares);
        req.flush(wireGroup);
    });

    it('should call the right endpoint for each change', () => {
        const calls: [string, string, unknown, () => void][] = [
            ['GET', '/api/users/me', null, () => api.me().subscribe()],
            ['POST', '/api/groups', { name: 'Ski' }, () => api.create('Ski').subscribe()],
            ['PATCH', '/api/groups/7', { name: 'Ski' }, () => api.rename(7, 'Ski').subscribe()],
            ['PUT', '/api/groups/7/owner', { ownerId: 3 }, () => api.transferOwnership(7, 3).subscribe()],
            ['DELETE', '/api/groups/7', null, () => api.remove(7).subscribe()],
            ['POST', '/api/friends', { identifier: 'petar' }, () => api.addFriend('petar').subscribe()],
            ['POST', '/api/groups/7/members', { identifier: 'petar' }, () => api.addMember(7, 'petar').subscribe()],
            ['DELETE', '/api/groups/7/members/3', null, () => api.removeMember(7, 3).subscribe()],
            ['DELETE', '/api/groups/7/members/me', null, () => api.leave(7).subscribe()],
            ['DELETE', '/api/groups/7/expenses/1', null, () => api.deleteExpense(7, 1).subscribe()],
            ['POST', '/api/groups/7/settlements', { fromId: 3, toId: 2, amount: 400 }, () => api.addSettlement(7, { fromId: 3, toId: 2, amount: 400 }).subscribe()],
            ['DELETE', '/api/groups/7/settlements/5', null, () => api.deleteSettlement(7, 5).subscribe()],
        ];

        for (const [method, url, body, run] of calls) {
            run();
            const req = http.expectOne({ method, url });
            expect(req.request.body).toEqual(body);
            req.flush(method === 'GET' ? { id: 2, username: 'ace', email: 'ace@example.com', role: 'USER' } : wireGroup);
        }
    });
});
