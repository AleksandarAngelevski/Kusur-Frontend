import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { GroupDetails } from '../models/group.model';
import { AdminApi } from '../services/admin.api';
import { GroupsService } from '../services/groups.service';
import { loadFakeGroups, provideFakeGroupsApi } from '../testing/fake-groups-api';
import { AdminGroupComponent } from './admin-group-component';

/** a group the signed-in admin (id 1) is not a member of */
const skiWeekend = (): GroupDetails => ({
    id: 9,
    name: 'Ski weekend',
    ownerId: 7,
    members: [{ id: 7, name: 'stefan' }, { id: 8, name: 'ana' }],
    formerMembers: [{ id: 6, name: 'Deleted user' }],
    expenses: [
        { id: 31, description: 'Cabin', amount: 12000, date: new Date(2026, 8, 5, 12), paidById: 7, splitBetweenIds: [7, 8] },
        { id: 32, description: 'Ski passes', amount: 8400, date: new Date(2026, 8, 6, 12), paidById: 6, splitBetweenIds: [6, 7, 8] },
    ],
    settlements: [],
});

describe('AdminGroupComponent', () => {
    let fixture: ComponentFixture<AdminGroupComponent>;
    let el: HTMLElement;

    const words = (node: Element) => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const parts: string[] = [];
        while (walker.nextNode()) parts.push(walker.currentNode.textContent!.replace(/\s+/g, ' ').trim());
        return parts.filter(Boolean).join(' ');
    };

    const open = async (id: string) => {
        await TestBed.configureTestingModule({
            imports: [AdminGroupComponent],
            providers: [
                provideRouter([]),
                provideFakeGroupsApi(),
                { provide: AdminApi, useValue: { groups: () => of([skiWeekend()]) } },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
            ],
        }).compileComponents();

        loadFakeGroups('ADMIN');
        TestBed.inject(GroupsService).loadAllGroups().subscribe();
        fixture = TestBed.createComponent(AdminGroupComponent);
        el = fixture.nativeElement;
        await fixture.whenStable();
    };

    it('should show a group the admin is not in, with its owner and members', async () => {
        await open('9');

        expect(el.querySelector('h1')!.textContent).toBe('Ski weekend');
        expect(words(el.querySelector('.group-header p')!)).toBe('Owned by stefan · 2 members: stefan, ana');
    });

    it('should list its expenses newest first, each linking to the admin edit page', async () => {
        await open('9');

        const rows = Array.from(el.querySelectorAll('a.row'));
        expect(rows.map(words)).toEqual([
            'Ski passes Deleted user paid · 6 Sep 8.400 ден Edit',
            'Cabin stefan paid · 5 Sep 12.000 ден Edit',
        ]);
        expect(rows.map((row) => row.getAttribute('href'))).toEqual([
            '/admin/groups/9/expenses/32/edit',
            '/admin/groups/9/expenses/31/edit',
        ]);
    });

    it('should say so when the group does not exist', async () => {
        await open('404');

        expect(el.querySelector('h1')!.textContent).toBe('Group not found');
        expect(el.querySelector('.back')!.getAttribute('href')).toBe('/admin');
    });
});
