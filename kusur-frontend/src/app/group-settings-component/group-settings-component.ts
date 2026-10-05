import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { GroupsService, ME_ID, memberName } from '../services/groups.service';
import { netBalances } from '../shared/balances';
import { initials } from '../shared/initials';
import { notBlank } from '../shared/validators';

/** Rename or delete a group and remove members (owner), or leave it (everyone else). */
@Component({
    imports: [ReactiveFormsModule, RouterLink],
    selector: 'app-group-settings-component',
    styleUrls: ['../shared/app-form.css', './group-settings-component.css'],
    templateUrl: './group-settings-component.html',
})
export class GroupSettingsComponent {
    private groups = inject(GroupsService);
    private router = inject(Router);
    private groupId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

    protected readonly meId = ME_ID;
    protected readonly initials = initials;

    group = computed(() => this.groups.group(this.groupId));
    isOwner = computed(() => this.group()?.ownerId === ME_ID);
    ownerName = computed(() => {
        const group = this.group();
        return group ? memberName(group, group.ownerId) : '';
    });

    private net = computed(() => {
        const group = this.group();
        return group ? netBalances(group) : new Map<number, number>();
    });

    /** each member with whether they still owe or are owed money, which blocks removing them */
    members = computed(() =>
        (this.group()?.members ?? []).map((member) => ({
            ...member,
            isOwner: member.id === this.group()?.ownerId,
            settled: (this.net().get(member.id) ?? 0) === 0,
        }))
    );

    iAmSettled = computed(() => (this.net().get(ME_ID) ?? 0) === 0);

    renameForm = new FormGroup({
        name: new FormControl(this.group()?.name ?? '', { nonNullable: true, validators: [Validators.required, notBlank] })
    });
    renamed = signal(false);

    /** which destructive action is waiting for its second click */
    confirming = signal<'delete' | 'leave' | null>(null);

    rename(){
        this.renamed.set(false);
        if (this.renameForm.invalid) {
            this.renameForm.markAllAsTouched();
            return;
        }
        this.groups.renameGroup(this.groupId, this.renameForm.controls.name.value);
        this.renamed.set(true);
    }

    nameError(): string {
        const name = this.renameForm.controls.name;
        return name.touched && name.invalid ? 'Give the group a name.' : '';
    }

    removeMember(memberId: number){
        this.groups.removeMember(this.groupId, memberId);
    }

    deleteGroup(){
        this.groups.deleteGroup(this.groupId);
        this.router.navigate(['/groups']);
    }

    leaveGroup(){
        if (this.groups.leaveGroup(this.groupId)) {
            this.router.navigate(['/groups']);
        }
    }
}
