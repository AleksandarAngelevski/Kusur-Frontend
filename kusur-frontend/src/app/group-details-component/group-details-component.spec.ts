import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { GroupsService } from '../services/groups.service';
import { loadFakeGroups, provideFakeGroupsApi } from '../testing/fake-groups-api';
import { GroupDetailsComponent } from './group-details-component';

describe('GroupDetailsComponent', () => {
    let fixture: ComponentFixture<GroupDetailsComponent>;
    let el: HTMLElement;

    /** an element's text as a reader sees it: each piece of text separated by one space */
    const words = (node: Element) => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        const parts: string[] = [];
        while (walker.nextNode()) parts.push(walker.currentNode.textContent!.replace(/\s+/g, ' ').trim());
        return parts.filter(Boolean).join(' ');
    };

    const text = (selector: string) => Array.from(el.querySelectorAll(selector)).map(words);

    /** the rows under the section with the given heading */
    const rows = (heading: string) => {
        const title = Array.from(el.querySelectorAll('.section-title')).find((h) => h.textContent === heading)!;
        return Array.from(title.nextElementSibling!.querySelectorAll('.row')).map(words);
    };

    const addMember = async (name: string) => {
        const input = el.querySelector<HTMLInputElement>('#new-member')!;
        input.value = name;
        input.dispatchEvent(new Event('input'));
        el.querySelector('form.add-member')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    };

    /** Renders the page as if opened at /groups/<id>. */
    const open = async (id: string, setup: (service: GroupsService) => void = () => {}) => {
        await TestBed.configureTestingModule({
            imports: [GroupDetailsComponent],
            providers: [
                provideRouter([]),
                provideFakeGroupsApi(),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
            ],
        }).compileComponents();

        setup(loadFakeGroups());
        fixture = TestBed.createComponent(GroupDetailsComponent);
        el = fixture.nativeElement;
        await fixture.whenStable();
    };

    describe('for an existing group', () => {
        beforeEach(() => open('1'));

        it('should show the name, member count and my balance', () => {
            expect(text('h1')).toEqual(['Ohrid Trip']);
            expect(text('.group-header p')).toEqual(['4 members']);
            expect(text('.netcard .big')).toEqual(['+1.200 ден']);
            expect(el.querySelector('.netcard .big')!.classList).toContain('credit');
        });

        it('should list the payments that settle the group', () => {
            expect(rows('Who pays whom')).toEqual([
                'Marija pays you 800 ден',
                'Nikola pays you 400 ден',
            ]);
        });

        it('should list each member with their balance', () => {
            expect(rows('Members')).toEqual([
                'YO You +1.200 ден gets back',
                'PE Petar Settled up',
                'MA Marija -800 ден owes',
                'NI Nikola -400 ден owes',
            ]);
        });

        it('should show the history newest first with my share', () => {
            expect(rows('History').map((row) => row.replace(/ · \d+ \w+/, ''))).toEqual([
                'Boat tickets Petar paid 800 ден',
                'Fuel and tolls You paid 1.600 ден your share 400 ден',
            ]);
        });

        it('should link to add expense, settle up and settings', () => {
            expect(Array.from(el.querySelectorAll('.actions a')).map((a) => a.getAttribute('href'))).toEqual([
                '/groups/1/expenses/new',
                '/groups/1/settle',
                '/groups/1/settings',
            ]);
        });

        it('should update when a settlement is recorded', async () => {
            TestBed.inject(GroupsService).addSettlement(1, { fromId: 3, toId: 1, amount: 800 }).subscribe();
            await fixture.whenStable();

            expect(text('.netcard .big')).toEqual(['+400 ден']);
            expect(rows('Who pays whom')).toEqual(['Nikola pays you 400 ден']);
            expect(rows('History')[0]).toContain('Marija paid you Settlement');
        });

        describe('with a recorded settlement', () => {
            const click = async (text: string) => {
                Array.from(el.querySelectorAll('.undo button')).find((button) => button.textContent!.trim() === text)!
                    .dispatchEvent(new Event('click'));
                await fixture.whenStable();
            };

            beforeEach(async () => {
                TestBed.inject(GroupsService).addSettlement(1, { fromId: 3, toId: 1, amount: 800 }).subscribe();
                await fixture.whenStable();
            });

            it('should offer Undo on the settlement only', () => {
                expect(text('.undo button')).toEqual(['Undo']);
                expect(el.querySelectorAll('a.row').length).toBe(2);
            });

            it('should keep the settlement when the undo is cancelled', async () => {
                await click('Undo');
                expect(text('.undo button')).toEqual(['Yes, undo it', 'Keep it']);
                expect(text('.netcard .big')).toEqual(['+400 ден']);

                await click('Keep it');
                expect(text('.undo button')).toEqual(['Undo']);
                expect(TestBed.inject(GroupsService).group(1)!.settlements.length).toBe(1);
            });

            it('should remove the settlement and restore the balances on the second click', async () => {
                await click('Undo');
                await click('Yes, undo it');

                expect(TestBed.inject(GroupsService).group(1)!.settlements).toEqual([]);
                expect(text('.netcard .big')).toEqual(['+1.200 ден']);
                expect(rows('Who pays whom')).toEqual(['Marija pays you 800 ден', 'Nikola pays you 400 ден']);
                expect(el.querySelector('.undo')).toBeNull();
            });
        });

        it('should add a member and clear the field', async () => {
            await addMember('Ana');

            expect(text('.group-header p')).toEqual(['5 members']);
            expect(rows('Members').at(-1)).toBe('AN Ana Settled up');
            expect(el.querySelector<HTMLInputElement>('#new-member')!.value).toBe('');
        });

        it('should show the backend\'s message when nobody has that username or email', async () => {
            await addMember('nobody');

            expect(text('.field-error')).toEqual(['No user with that username or email.']);
            expect(el.querySelector<HTMLInputElement>('#new-member')!.value).toBe('nobody');
        });

        it('should refuse an empty name and a duplicate', async () => {
            await addMember('   ');
            expect(text('.field-error')).toEqual(['Enter a username or email.']);

            await addMember('petar');
            expect(text('.field-error')).toEqual(['Petar is already in this group.']);
            expect(text('.group-header p')).toEqual(['4 members']);
        });
    });

    describe('for a tab with a friend', () => {
        // the fake backend numbers what it creates from 100: the tab is 100 and stefan is 101
        const TAB = 100;
        const STEFAN = 101;
        let navigate: ReturnType<typeof vi.spyOn>;

        const click = async (label: string) => {
            Array.from(el.querySelectorAll('button')).find((button) => button.textContent!.trim() === label)!.click();
            await fixture.whenStable();
        };

        beforeEach(async () => {
            await open(String(TAB), (service) => service.addFriend('stefan').subscribe());
            navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        });

        it('should be titled with the friend and leave out the group-only parts', () => {
            expect(text('h1')).toEqual(['stefan']);
            expect(text('.group-header p')).toEqual(['Expenses between the two of you']);
            expect(text('.netcard .label')).toEqual(['Your balance with stefan']);
            expect(text('.section-title')).toEqual(['History']);
            expect(el.querySelector('form.add-member')).toBeNull();
            expect(Array.from(el.querySelectorAll('.actions a')).map((a) => a.getAttribute('href'))).toEqual([
                `/groups/${TAB}/expenses/new`,
                `/groups/${TAB}/settle`,
            ]);
        });

        it('should show what we owe each other once there is an expense', async () => {
            TestBed.inject(GroupsService)
                .addExpense(TAB, { description: 'Lunch', amount: 600, date: new Date(), paidById: 1, splitBetweenIds: [1, STEFAN] })
                .subscribe();
            await fixture.whenStable();

            expect(text('.netcard .big')).toEqual(['+300 ден']);
            expect(rows('History')[0]).toContain('Lunch You paid');
            expect(el.querySelector('.remove-friend')!.textContent).toContain('Settle up with stefan before removing them');
            expect(text('.remove-friend button')).toEqual([]);
        });

        it('should remove the friend after a second click when we are settled up', async () => {
            await click('Remove friend');
            expect(TestBed.inject(GroupsService).friends().length).toBe(1);

            await click('Keep');
            await click('Remove friend');
            await click('Yes, remove');

            expect(TestBed.inject(GroupsService).friends()).toEqual([]);
            expect(navigate).toHaveBeenCalledWith(['/groups']);
        });
    });

    describe('for a group that does not exist', () => {
        beforeEach(() => open('999'));

        it('should say so and link back to the list', () => {
            expect(text('h1')).toEqual(['Group not found']);
            expect(el.querySelector('.back')!.getAttribute('href')).toBe('/groups');
            expect(el.querySelector('.netcard')).toBeNull();
        });
    });
});
