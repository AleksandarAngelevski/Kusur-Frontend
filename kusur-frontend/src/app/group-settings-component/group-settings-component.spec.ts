import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { loadFakeGroups, provideFakeGroupsApi } from '../testing/fake-groups-api';
import { GroupSettingsComponent } from './group-settings-component';

describe('GroupSettingsComponent', () => {
    let fixture: ComponentFixture<GroupSettingsComponent>;
    let el: HTMLElement;
    let groups: GroupsService;
    let navigate: ReturnType<typeof vi.spyOn>;

    const buttons = () => Array.from(el.querySelectorAll('button')).map((button) => button.textContent!.trim());

    const click = async (text: string, index = 0) => {
        Array.from(el.querySelectorAll('button')).filter((button) => button.textContent!.trim() === text)[index].click();
        await fixture.whenStable();
    };

    const memberRows = () =>
        Array.from(el.querySelectorAll('.register .row')).map((row) =>
            Array.from(row.querySelectorAll('.title, .desc, .caption, button')).map((node) => node.textContent!.trim()).join(' | ')
        );

    const typeName = async (value: string) => {
        const input = el.querySelector<HTMLInputElement>('#name')!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        await fixture.whenStable();
    };

    const submit = async () => {
        el.querySelector('form')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    };

    /** Renders the page as if opened at /groups/<id>/settings, after any setup on the service. */
    const open = async (id: number, setup: (service: GroupsService) => void = () => {}) => {
        await TestBed.configureTestingModule({
            imports: [GroupSettingsComponent],
            providers: [
                provideRouter([]),
                provideFakeGroupsApi(),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: String(id) }) } } },
            ],
        }).compileComponents();

        groups = loadFakeGroups();
        setup(groups);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(GroupSettingsComponent);
        el = fixture.nativeElement;
        await fixture.whenStable();
    };

    describe('in a group I own', () => {
        beforeEach(() => open(1));

        it('should let me rename it', async () => {
            expect(el.querySelector<HTMLInputElement>('#name')!.value).toBe('Ohrid Trip');

            await typeName('  Ohrid 2026 ');
            await submit();

            expect(groups.group(1)!.name).toBe('Ohrid 2026');
            expect(el.querySelector('.saved')!.textContent).toContain('Saved.');
        });

        it('should refuse a blank name', async () => {
            await typeName('   ');
            await submit();

            expect(el.querySelector('.field-error')!.textContent).toContain('Give the group a name.');
            expect(groups.group(1)!.name).toBe('Ohrid Trip');
        });

        it('should offer to remove only members who are settled up, and never the owner', () => {
            expect(memberRows()).toEqual([
                'You | Owner',
                'Petar | Make owner | Remove',
                'Marija | Make owner | Settle up before removing',
                'Nikola | Make owner | Settle up before removing',
            ]);
        });

        it('should remove a settled member but keep their name in the history', async () => {
            await click('Remove');

            const group = groups.group(1)!;
            expect(group.members.map((member) => member.name)).toEqual(['You', 'Marija', 'Nikola']);
            expect(group.formerMembers.map((member) => member.name)).toEqual(['Petar']);
            expect(groups.activity().some((entry) => entry.activity === 'Petar added Boat tickets')).toBe(true);
        });

        it('should hand the group to a member after a second click, leaving me an ordinary member', async () => {
            await click('Make owner', 1);
            expect(groups.group(1)!.ownerId).toBe(1);
            expect(memberRows()[2]).toBe('Marija | Hand the group to Marija? You stay a member. | Yes, make owner | Cancel');

            await click('Cancel');
            await click('Make owner', 1);
            await click('Yes, make owner');

            expect(groups.group(1)!.ownerId).toBe(3);
            expect(memberRows()).toEqual(['You', 'Petar', 'Marija | Owner', 'Nikola']);
            expect(el.querySelector('.lead')!.textContent).toContain('Only the owner, Marija,');
            expect(el.querySelector('form')).toBeNull();
            expect(buttons()).toEqual([]);
        });

        it('should only delete the group after a second click', async () => {
            await click('Delete group');
            expect(groups.group(1)).toBeDefined();

            await click('Keep it');
            expect(buttons()).toContain('Delete group');

            await click('Delete group');
            await click('Yes, delete it');
            expect(groups.group(1)).toBeUndefined();
            expect(navigate).toHaveBeenCalledWith(['/groups']);
        });

        it('should not offer to leave', () => {
            expect(buttons()).not.toContain('Leave group');
        });
    });

    describe('in a group someone else owns, while I owe money', () => {
        beforeEach(() => open(2));

        it('should say who the owner is and offer no owner actions', () => {
            expect(el.querySelector('.lead')!.textContent).toContain('Only the owner, Ana,');
            expect(el.querySelector('form')).toBeNull();
            expect(buttons()).toEqual([]);
        });

        it('should ask me to settle before leaving', () => {
            expect(el.querySelector('.danger-zone')!.textContent).toContain('Settle your balance');
        });
    });

    describe('in a group someone else owns, once I am settled', () => {
        beforeEach(() => open(2, (service) => service.addSettlement(2, { fromId: 1, toId: 5, amount: 3500 }).subscribe()));

        it('should let me leave after a second click, which drops the group from my list', async () => {
            await click('Leave group');
            expect(groups.group(2)).toBeDefined();

            await click('Yes, leave');
            expect(groups.groups().map((group) => group.name)).toEqual(['Ohrid Trip']);
            expect(navigate).toHaveBeenCalledWith(['/groups']);
        });
    });

    describe('for a group that does not exist', () => {
        beforeEach(() => open(999));

        it('should say so', () => {
            expect(el.querySelector('h1')!.textContent).toContain('Group not found');
            expect(el.querySelector('.danger-zone')).toBeNull();
        });
    });
});
