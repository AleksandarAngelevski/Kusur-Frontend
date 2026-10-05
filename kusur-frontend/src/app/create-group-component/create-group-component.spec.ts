import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { CreateGroupComponent } from './create-group-component';

describe('CreateGroupComponent', () => {
    let fixture: ComponentFixture<CreateGroupComponent>;
    let el: HTMLElement;
    let groups: GroupsService;
    let navigate: ReturnType<typeof vi.spyOn>;

    const fieldErrors = () =>
        Array.from(el.querySelectorAll('.field-error')).map((p) => p.textContent?.trim());

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

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CreateGroupComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        groups = TestBed.inject(GroupsService);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(CreateGroupComponent);
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    it('should ask for a name and create nothing when submitted empty or blank', async () => {
        await submit();
        expect(fieldErrors()).toEqual(['Give the group a name.']);

        await typeName('   ');
        await submit();
        expect(fieldErrors()).toEqual(['Give the group a name.']);
        expect(groups.groups().length).toBe(2);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('should create the group and open it', async () => {
        await typeName('Ski weekend');
        await submit();

        const created = groups.groups().at(-1)!;
        expect(created.name).toBe('Ski weekend');
        expect(navigate).toHaveBeenCalledWith(['/groups', created.id]);
    });
});
