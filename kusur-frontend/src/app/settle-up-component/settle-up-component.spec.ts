import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { SettleUpComponent } from './settle-up-component';

describe('SettleUpComponent', () => {
    let fixture: ComponentFixture<SettleUpComponent>;
    let el: HTMLElement;
    let groups: GroupsService;
    let navigate: ReturnType<typeof vi.spyOn>;
    /** the :id the stubbed route reports; set in open() once the service can supply it */
    let routeId = '';

    const fieldErrors = () =>
        Array.from(el.querySelectorAll('.field-error')).map((p) => p.textContent?.trim());

    const selected = (id: string) => {
        const select = el.querySelector<HTMLSelectElement>(`#${id}`)!;
        return select.options[select.selectedIndex].textContent?.trim();
    };

    const choose = async (id: string, name: string) => {
        const select = el.querySelector<HTMLSelectElement>(`#${id}`)!;
        select.selectedIndex = Array.from(select.options).findIndex((option) => option.textContent?.trim() === name);
        select.dispatchEvent(new Event('change'));
        select.dispatchEvent(new Event('blur'));
        await fixture.whenStable();
    };

    const typeAmount = async (value: string) => {
        const input = el.querySelector<HTMLInputElement>('#amount')!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        await fixture.whenStable();
    };

    const submit = async () => {
        el.querySelector('form')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    };

    /** Renders the page as if opened at /groups/<id>/settle, after any setup on the service. */
    const open = async (id: (groups: GroupsService) => number) => {
        await TestBed.configureTestingModule({
            imports: [SettleUpComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { snapshot: { get paramMap() { return convertToParamMap({ id: routeId }); } } } },
            ],
        }).compileComponents();

        groups = TestBed.inject(GroupsService);
        routeId = String(id(groups));
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(SettleUpComponent);
        el = fixture.nativeElement;
        await fixture.whenStable();
    };

    describe('for a group with debts', () => {
        beforeEach(() => open(() => 1));

        it('should fill in the payment that involves me', () => {
            expect([selected('fromId'), selected('toId')]).toEqual(['Marija', 'You']);
            expect(el.querySelector<HTMLInputElement>('#amount')!.value).toBe('800');
        });

        it('should record the payment and go back to the group', async () => {
            await typeAmount('300');
            await submit();

            expect(groups.group(1)!.settlements.at(-1)).toMatchObject({ fromId: 3, toId: 1, amount: 300 });
            expect(groups.groups().find((group) => group.id === 1)!.balance).toBe(900);
            expect(navigate).toHaveBeenCalledWith(['/groups', 1]);
        });

        it('should refuse a payment from someone to themselves', async () => {
            await choose('fromId', 'You');
            await submit();

            expect(fieldErrors()).toEqual(['Pick two different people.']);
            expect(groups.group(1)!.settlements.length).toBe(0);
        });

        it('should reject a missing, zero or decimal amount', async () => {
            await typeAmount('');
            expect(fieldErrors()).toEqual(['Enter an amount.']);

            await typeAmount('0');
            expect(fieldErrors()).toEqual(['Enter an amount above zero.']);

            await typeAmount('10.5');
            expect(fieldErrors()).toEqual(['Use whole denars, no decimals.']);
        });
    });

    describe('for a group with only me in it', () => {
        beforeEach(() => open((service) => service.createGroup('Solo').id));

        it('should ask for another member instead of showing the form', () => {
            expect(el.querySelector('.lead')!.textContent).toContain('Add another member');
            expect(el.querySelector('form')).toBeNull();
        });
    });

    describe('for a group that does not exist', () => {
        beforeEach(() => open(() => 999));

        it('should say so instead of showing the form', () => {
            expect(el.querySelector('h1')!.textContent).toContain('Group not found');
            expect(el.querySelector('form')).toBeNull();
        });
    });
});
