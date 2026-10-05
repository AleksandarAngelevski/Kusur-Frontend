import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminApi, AdminGroup, AdminUser } from '../services/admin.api';
import { GroupsApi } from '../services/groups.api';
import { loadFakeGroups, ME_ID, provideFakeGroupsApi } from '../testing/fake-groups-api';
import { AdminComponent } from './admin-component';

const users = (): AdminUser[] => [
    { id: ME_ID, username: 'ace', email: 'ace@example.com', role: 'ADMIN', enabled: true },
    { id: 2, username: 'petar', email: 'petar@example.com', role: 'USER', enabled: true },
    { id: 3, username: 'marija', email: 'marija@example.com', role: 'ADMIN', enabled: true },
];

const groups = (): AdminGroup[] => [
    { id: 1, name: 'Ohrid Trip', ownerId: ME_ID, members: [{ id: ME_ID, name: 'ace' }, { id: 2, name: 'petar' }], formerMembers: [], expenses: [{}, {}], settlements: [] },
    { id: 9, name: 'Ski weekend', ownerId: 3, members: [{ id: 2, name: 'petar' }], formerMembers: [{ id: 3, name: 'marija' }], expenses: [{}], settlements: [] },
];

describe('AdminComponent', () => {
    let fixture: ComponentFixture<AdminComponent>;
    let el: HTMLElement;
    let api: { users: ReturnType<typeof vi.fn>; groups: ReturnType<typeof vi.fn>; setRole: ReturnType<typeof vi.fn>; deleteGroup: ReturnType<typeof vi.fn> };

    const words = (node: Element) => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const parts: string[] = [];
        while (walker.nextNode()) parts.push(walker.currentNode.textContent!.replace(/\s+/g, ' ').trim());
        return parts.filter(Boolean).join(' ');
    };

    /** the rows under the section whose heading starts with the given word */
    const rows = (heading: string) => {
        const title = Array.from(el.querySelectorAll('.section-title')).find((h) => h.textContent!.startsWith(heading))!;
        return Array.from(title.nextElementSibling!.querySelectorAll('.row')).map(words);
    };

    const click = async (text: string, index = 0) => {
        Array.from(el.querySelectorAll('button')).filter((button) => button.textContent!.trim() === text)[index].click();
        await fixture.whenStable();
    };

    const open = async () => {
        await TestBed.configureTestingModule({
            imports: [AdminComponent],
            providers: [provideFakeGroupsApi(), { provide: AdminApi, useValue: api }],
        }).compileComponents();

        loadFakeGroups('ADMIN');
        fixture = TestBed.createComponent(AdminComponent);
        el = fixture.nativeElement;
        await fixture.whenStable();
    };

    beforeEach(() => {
        api = {
            users: vi.fn(() => of(users())),
            groups: vi.fn(() => of(groups())),
            setRole: vi.fn((id: number, role: 'USER' | 'ADMIN') => of({ ...users().find((user) => user.id === id)!, role })),
            deleteGroup: vi.fn(() => of(undefined)),
        };
    });

    it('should list every user with their role, and no role button for me', async () => {
        await open();

        expect(rows('Users')).toEqual([
            'AC ace you Admin ace@example.com',
            'PE petar petar@example.com Make admin',
            'MA marija Admin marija@example.com Remove admin',
        ]);
    });

    it('should list every group with its owner, even one who has left', async () => {
        await open();

        expect(rows('Groups')).toEqual([
            'OT Ohrid Trip Owned by ace · 2 members · 2 expenses Delete',
            'SW Ski weekend Owned by marija · 1 member · 1 expense Delete',
        ]);
    });

    it('should make a user an admin and take it away again', async () => {
        await open();

        await click('Make admin');
        expect(api.setRole).toHaveBeenCalledWith(2, 'ADMIN');
        expect(rows('Users')[1]).toBe('PE petar Admin petar@example.com Remove admin');

        await click('Remove admin');
        expect(api.setRole).toHaveBeenLastCalledWith(2, 'USER');
        expect(rows('Users')[1]).toBe('PE petar petar@example.com Make admin');
    });

    it('should only delete a group after a second click, then refresh my own groups', async () => {
        await open();
        const reload = vi.spyOn(TestBed.inject(GroupsApi), 'list');

        await click('Delete', 1);
        expect(api.deleteGroup).not.toHaveBeenCalled();

        await click('Keep');
        await click('Delete', 1);
        await click('Yes, delete');

        expect(api.deleteGroup).toHaveBeenCalledWith(9);
        expect(rows('Groups')).toEqual(['OT Ohrid Trip Owned by ace · 2 members · 2 expenses Delete']);
        expect(reload).toHaveBeenCalledTimes(1);
    });

    it('should show the backend\'s message when a change is refused', async () => {
        api.setRole.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'Only an admin can do that.' } })));
        await open();

        await click('Make admin');

        expect(el.querySelector('.problem')!.textContent).toContain('Only an admin can do that.');
        expect(rows('Users')[1]).toBe('PE petar petar@example.com Make admin');
    });

    it('should say when the data cannot be loaded, and load it on Reload', async () => {
        api.users.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 502 })));
        await open();

        expect(el.querySelector('.problem')!.textContent).toContain("Can't reach the server.");
        expect(el.querySelectorAll('.row').length).toBe(0);

        await click('Reload');
        expect(el.querySelector('.problem')).toBeNull();
        expect(rows('Users').length).toBe(3);
    });
});
