import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { loadFakeGroups, provideFakeGroupsApi } from '../testing/fake-groups-api';
import { AddFriendComponent } from './add-friend-component';

describe('AddFriendComponent', () => {
    let fixture: ComponentFixture<AddFriendComponent>;
    let el: HTMLElement;
    let groups: GroupsService;
    let navigate: ReturnType<typeof vi.spyOn>;

    const type = async (value: string) => {
        const input = el.querySelector<HTMLInputElement>('#identifier')!;
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
            imports: [AddFriendComponent],
            providers: [provideRouter([]), provideFakeGroupsApi()],
        }).compileComponents();

        groups = loadFakeGroups();
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        fixture = TestBed.createComponent(AddFriendComponent);
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    it('should ask for a username or email and add nobody when submitted empty', async () => {
        await submit();

        expect(el.querySelector('.field-error')!.textContent).toContain('Enter a username or email.');
        expect(groups.friends()).toEqual([]);
        expect(navigate).not.toHaveBeenCalled();
    });

    it('should open a tab with the friend and go to it', async () => {
        await type('  stefan ');
        await submit();

        const [friend] = groups.friends();
        expect(friend).toMatchObject({ name: 'stefan', balance: 0 });
        expect(groups.group(friend.id)!.members.map((member) => member.name)).toEqual(['You', 'stefan']);
        expect(navigate).toHaveBeenCalledWith(['/groups', friend.id]);
    });

    it('should show why when nobody has that username or email', async () => {
        await type('nobody');
        await submit();

        expect(el.querySelector('.error')!.textContent).toContain('No user with that username or email.');
        expect(groups.friends()).toEqual([]);
        expect(el.querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
    });
});
