import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { ExpenseFormComponent } from './expense-form-component';

describe('ExpenseFormComponent', () => {
    let fixture: ComponentFixture<ExpenseFormComponent>;
    let el: HTMLElement;
    let groups: GroupsService;
    let navigate: ReturnType<typeof vi.spyOn>;

    const fieldErrors = () =>
        Array.from(el.querySelectorAll('.field-error')).map((p) => p.textContent?.trim());

    const hint = () => el.querySelector('.hint')?.textContent!.replace(/\s+/g, ' ').trim();

    const type = async (id: string, value: string) => {
        const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        await fixture.whenStable();
    };

    const labelled = (selector: string, name: string) =>
        Array.from(el.querySelectorAll(selector)).find((node) => node.textContent!.trim() === name)!;

    const toggle = async (name: string) => {
        labelled('label.check', name).querySelector('input')!.click();
        await fixture.whenStable();
    };

    const chooseMode = async (name: 'Equally' | 'By amounts') => {
        labelled('label.mode', name).querySelector('input')!.click();
        await fixture.whenStable();
    };

    /** types an amount next to a member's name in "by amounts" mode */
    const share = (name: string, value: string) =>
        type(labelled('.share label', name).getAttribute('for')!, value);

    const submit = async () => {
        el.querySelector('form')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    };

    const click = async (text: string) => {
        Array.from(el.querySelectorAll('button')).find((button) => button.textContent!.trim() === text)!.click();
        await fixture.whenStable();
    };

    /** Renders the page as if opened with the given route params. */
    const open = async (params: Record<string, string>) => {
        await TestBed.configureTestingModule({
            imports: [ExpenseFormComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(params) } } },
            ],
        }).compileComponents();

        groups = TestBed.inject(GroupsService);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(ExpenseFormComponent);
        el = fixture.nativeElement;
        await fixture.whenStable();
    };

    describe('adding to an existing group', () => {
        beforeEach(() => open({ id: '1' }));

        it('should start with me as payer, today as the date and everyone ticked', () => {
            const select = el.querySelector<HTMLSelectElement>('#paidById')!;
            expect(el.querySelector('h1')!.textContent).toContain('Add expense');
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

            expect(hint()).toBe('333–334 ден each between 3 people');
        });

        it('should add the expense and go back to the group', async () => {
            await type('description', '  Dinner  ');
            await type('amount', '900');
            await type('date', '2026-09-30');
            await toggle('Nikola');
            await submit();

            const added = groups.group(1)!.expenses.at(-1)!;
            expect(added).toMatchObject({ description: 'Dinner', amount: 900, paidById: 1, splitBetweenIds: [1, 2, 3] });
            expect(added.customShares).toBeUndefined();
            expect([added.date.getFullYear(), added.date.getMonth() + 1, added.date.getDate()]).toEqual([2026, 9, 30]);
            expect(navigate).toHaveBeenCalledWith(['/groups', 1]);
        });

        it('should not offer to delete', () => {
            expect(el.querySelector('.danger-zone')).toBeNull();
        });

        describe('splitting by amounts', () => {
            beforeEach(async () => {
                await type('description', 'Dinner');
                await type('amount', '1000');
                await chooseMode('By amounts');
            });

            it('should show how much is still to assign as shares are typed', async () => {
                expect(hint()).toBe('1.000 ден still to assign');

                await share('You', '250');
                expect(hint()).toBe('750 ден still to assign');

                await share('Petar', '750');
                expect(hint()).toBe('Adds up to the total.');

                await share('Marija', '100');
                expect(hint()).toBe('100 ден over the total');
            });

            it('should refuse shares that do not add up to the total', async () => {
                await share('You', '250');
                await submit();
                expect(fieldErrors()).toEqual(['750 ден still to assign.']);

                await share('Petar', '800');
                await submit();
                expect(fieldErrors()).toEqual(['The shares are 50 ден over the total.']);
                expect(groups.group(1)!.expenses.length).toBe(2);
            });

            it('should refuse a negative or decimal share', async () => {
                await share('You', '500.5');
                await share('Petar', '499.5');
                await submit();

                expect(fieldErrors()).toEqual(['Use whole denars for each share.']);
            });

            it('should save each person their own amount and leave out those with none', async () => {
                await share('You', '250');
                await share('Petar', '750');
                await share('Marija', '0');
                await submit();

                expect(groups.group(1)!.expenses.at(-1)).toMatchObject({
                    amount: 1000,
                    splitBetweenIds: [1, 2],
                    customShares: [{ memberId: 1, amount: 250 }, { memberId: 2, amount: 750 }],
                });
                // I paid 1000 and owe 250 of it, on top of the 1200 I was already owed
                expect(groups.groups().find((group) => group.id === 1)!.balance).toBe(1950);
            });
        });
    });

    describe('editing an expense', () => {
        beforeEach(() => open({ id: '1', expenseId: '1' }));

        it('should fill the form from the expense', () => {
            expect(el.querySelector('h1')!.textContent).toContain('Edit expense');
            expect(el.querySelector<HTMLInputElement>('#description')!.value).toBe('Fuel and tolls');
            expect(el.querySelector<HTMLInputElement>('#amount')!.value).toBe('1600');
            expect(hint()).toBe('400 ден each between 4 people');
        });

        it('should save the changes in place and go back to the group', async () => {
            await type('amount', '2000');
            await toggle('Nikola');
            await submit();

            const expenses = groups.group(1)!.expenses;
            expect(expenses.length).toBe(2);
            expect(expenses.find((expense) => expense.id === 1)).toMatchObject({
                description: 'Fuel and tolls', amount: 2000, splitBetweenIds: [1, 2, 3],
            });
            expect(navigate).toHaveBeenCalledWith(['/groups', 1]);
        });

        it('should switch an equal split to custom amounts', async () => {
            await chooseMode('By amounts');
            await share('You', '600');
            await share('Petar', '1000');
            await submit();

            expect(groups.group(1)!.expenses.find((expense) => expense.id === 1)!.customShares).toEqual([
                { memberId: 1, amount: 600 }, { memberId: 2, amount: 1000 },
            ]);
        });

        it('should only delete after a second click', async () => {
            await click('Delete expense');
            expect(groups.group(1)!.expenses.length).toBe(2);

            await click('Keep it');
            expect(el.querySelector('.btn-danger')).toBeNull();

            await click('Delete expense');
            await click('Yes, delete it');
            expect(groups.group(1)!.expenses.map((expense) => expense.id)).toEqual([2]);
            expect(navigate).toHaveBeenCalledWith(['/groups', 1]);
        });
    });

    describe('editing an expense with custom shares', () => {
        beforeEach(async () => {
            await open({ id: '1', expenseId: '1' });
            groups.updateExpense(1, 1, {
                ...groups.group(1)!.expenses[0],
                customShares: [{ memberId: 1, amount: 600 }, { memberId: 2, amount: 1000 }],
                splitBetweenIds: [1, 2],
            });
            fixture = TestBed.createComponent(ExpenseFormComponent);
            el = fixture.nativeElement;
            await fixture.whenStable();
        });

        it('should open in "by amounts" mode with the amounts filled in', () => {
            expect(labelled('label.mode', 'By amounts').querySelector('input')!.checked).toBe(true);
            expect(Array.from(el.querySelectorAll<HTMLInputElement>('.share input')).map((input) => input.value)).toEqual(['600', '1000', '', '']);
            expect(hint()).toBe('Adds up to the total.');
        });
    });

    describe('when the group or expense does not exist', () => {
        it('should say the group is missing', async () => {
            await open({ id: '999' });

            expect(el.querySelector('h1')!.textContent).toContain('Group not found');
            expect(el.querySelector('form')).toBeNull();
        });

        it('should say the expense is missing', async () => {
            await open({ id: '1', expenseId: '999' });

            expect(el.querySelector('h1')!.textContent).toContain('Expense not found');
            expect(el.querySelector('form')).toBeNull();
        });
    });
});
