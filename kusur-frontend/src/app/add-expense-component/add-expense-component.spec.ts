import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { AddExpenseComponent } from './add-expense-component';

describe('AddExpenseComponent', () => {
    let fixture: ComponentFixture<AddExpenseComponent>;
    let el: HTMLElement;
    let groups: GroupsService;
    let navigate: ReturnType<typeof vi.spyOn>;

    const fieldErrors = () =>
        Array.from(el.querySelectorAll('.field-error')).map((p) => p.textContent?.trim());

    const type = async (id: string, value: string) => {
        const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        await fixture.whenStable();
    };

    const toggle = async (name: string) => {
        const label = Array.from(el.querySelectorAll('label.check')).find((l) => l.textContent!.trim() === name)!;
        label.querySelector('input')!.click();
        await fixture.whenStable();
    };

    const submit = async () => {
        el.querySelector('form')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    };

    const open = async (id: string) => {
        await TestBed.configureTestingModule({
            imports: [AddExpenseComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
            ],
        }).compileComponents();

        groups = TestBed.inject(GroupsService);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(AddExpenseComponent);
        el = fixture.nativeElement;
        await fixture.whenStable();
    };

    describe('for an existing group', () => {
        beforeEach(() => open('1'));

        it('should start with me as payer, today as the date and everyone ticked', () => {
            const select = el.querySelector<HTMLSelectElement>('#paidById')!;
            expect(select.options[select.selectedIndex].textContent?.trim()).toBe('You');
            expect(el.querySelector<HTMLInputElement>('#date')!.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
            expect(Array.from(el.querySelectorAll<HTMLInputElement>('.check input')).map((box) => box.checked)).toEqual([true, true, true, true]);
        });

        it('should show a message per field and add nothing when submitted empty', async () => {
            await submit();

            expect(fieldErrors()).toEqual(['Say what it was for.', 'Enter an amount.']);
            expect(groups.group(1)!.expenses.length).toBe(2);
            expect(navigate).not.toHaveBeenCalled();
        });

        it('should reject zero and decimal amounts', async () => {
            await type('description', 'Dinner');
            await type('amount', '0');
            expect(fieldErrors()).toEqual(['Enter an amount above zero.']);

            await type('amount', '10.5');
            expect(fieldErrors()).toEqual(['Use whole denars, no decimals.']);
        });

        it('should require at least one person to split between', async () => {
            await type('description', 'Dinner');
            await type('amount', '400');
            for (const name of ['You', 'Petar', 'Marija', 'Nikola']) await toggle(name);
            await submit();

            expect(fieldErrors()).toEqual(['Choose at least one person.']);
            expect(groups.group(1)!.expenses.length).toBe(2);
        });

        it('should preview the share per person', async () => {
            await type('amount', '1000');
            await toggle('Nikola');

            expect(el.querySelector('.hint')!.textContent!.replace(/\s+/g, ' ').trim()).toBe('333–334 ден each between 3 people');
        });

        it('should add the expense and go back to the group', async () => {
            await type('description', '  Dinner  ');
            await type('amount', '900');
            await type('date', '2026-09-30');
            await toggle('Nikola');
            await submit();

            const added = groups.group(1)!.expenses.at(-1)!;
            expect(added).toMatchObject({ description: 'Dinner', amount: 900, paidById: 1, splitBetweenIds: [1, 2, 3] });
            expect([added.date.getFullYear(), added.date.getMonth() + 1, added.date.getDate()]).toEqual([2026, 9, 30]);
            expect(navigate).toHaveBeenCalledWith(['/groups', 1]);
        });
    });

    describe('for a group that does not exist', () => {
        beforeEach(() => open('999'));

        it('should say so instead of showing the form', () => {
            expect(el.querySelector('h1')!.textContent).toContain('Group not found');
            expect(el.querySelector('form')).toBeNull();
        });
    });
});
