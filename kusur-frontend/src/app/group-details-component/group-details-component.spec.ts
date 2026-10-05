import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { GroupsService } from '../services/groups.service';
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
    const open = async (id: string) => {
        await TestBed.configureTestingModule({
            imports: [GroupDetailsComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id })) } },
            ],
        }).compileComponents();

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

        it('should link to add expense and settle up', () => {
            expect(Array.from(el.querySelectorAll('.actions a')).map((a) => a.getAttribute('href'))).toEqual([
                '/groups/1/expenses/new',
                '/groups/1/settle',
            ]);
        });

        it('should update when a settlement is recorded', async () => {
            TestBed.inject(GroupsService).addSettlement(1, { fromId: 3, toId: 1, amount: 800, date: new Date() });
            await fixture.whenStable();

            expect(text('.netcard .big')).toEqual(['+400 ден']);
            expect(rows('Who pays whom')).toEqual(['Nikola pays you 400 ден']);
            expect(rows('History')[0]).toContain('Marija paid you Settlement');
        });

        it('should add a member and clear the field', async () => {
            await addMember('Ana');

            expect(text('.group-header p')).toEqual(['5 members']);
            expect(rows('Members').at(-1)).toBe('AN Ana Settled up');
            expect(el.querySelector<HTMLInputElement>('#new-member')!.value).toBe('');
        });

        it('should refuse an empty name and a duplicate', async () => {
            await addMember('   ');
            expect(text('.field-error')).toEqual(['Enter a name.']);

            await addMember('petar');
            expect(text('.field-error')).toEqual(['petar is already in this group.']);
            expect(text('.group-header p')).toEqual(['4 members']);
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
