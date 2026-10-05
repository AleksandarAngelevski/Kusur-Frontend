import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AdminApi, AdminGroup, AdminUser } from '../services/admin.api';
import { GroupsService } from '../services/groups.service';
import { apiErrorMessage } from '../shared/api-error';
import { initials } from '../shared/initials';

/** Admin-only page: every account with its role, and every group. */
@Component({
    imports: [],
    selector: 'app-admin-component',
    styleUrl: './admin-component.css',
    templateUrl: './admin-component.html',
})
export class AdminComponent {
    private api = inject(AdminApi);
    private groupsService = inject(GroupsService);

    protected readonly initials = initials;
    protected meId = this.groupsService.meId;

    users = signal<AdminUser[]>([]);
    private allGroups = signal<AdminGroup[]>([]);
    loading = signal(true);
    errorMessage = signal('');

    /** the group whose Delete is waiting for its second click */
    confirmingDelete = signal<number | null>(null);
    /** the user whose Delete is waiting for its second click */
    confirmingUserDelete = signal<number | null>(null);

    groups = computed(() =>
        this.allGroups().map((group) => ({
            id: group.id,
            name: group.name,
            owner: [...group.members, ...group.formerMembers].find((member) => member.id === group.ownerId)?.name ?? 'Unknown',
            memberCount: group.members.length,
            expenseCount: group.expenses.length,
        }))
    );

    constructor() {
        this.load();
    }

    load(){
        this.loading.set(true);
        this.errorMessage.set('');
        forkJoin([this.api.users(), this.api.groups()]).subscribe({
            next: ([users, groups]) => {
                this.users.set(users);
                this.allGroups.set(groups);
                this.loading.set(false);
            },
            error: (err) => {
                this.loading.set(false);
                this.errorMessage.set(apiErrorMessage(err, "Couldn't load the admin data."));
            }
        });
    }

    /** Makes a user an admin, or a normal user again. */
    toggleRole(user: AdminUser){
        this.errorMessage.set('');
        this.api.setRole(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN').subscribe({
            next: (updated) => this.users.update((users) => users.map((u) => (u.id === updated.id ? updated : u))),
            error: (err) => this.errorMessage.set(apiErrorMessage(err)),
        });
    }

    deleteUser(userId: number){
        this.errorMessage.set('');
        this.api.deleteUser(userId).subscribe({
            next: () => {
                this.confirmingUserDelete.set(null);
                this.users.update((users) => users.filter((user) => user.id !== userId));
                // their groups changed hands or went with them, here and possibly in my own list
                this.api.groups().subscribe({
                    next: (groups) => this.allGroups.set(groups),
                    error: (err) => this.errorMessage.set(apiErrorMessage(err)),
                });
                this.groupsService.load().subscribe();
            },
            error: (err) => {
                this.confirmingUserDelete.set(null);
                this.errorMessage.set(apiErrorMessage(err));
            }
        });
    }

    deleteGroup(groupId: number){
        this.errorMessage.set('');
        this.api.deleteGroup(groupId).subscribe({
            next: () => {
                this.confirmingDelete.set(null);
                this.allGroups.update((groups) => groups.filter((group) => group.id !== groupId));
                // it may have been one of my own groups, so refresh my copy too
                this.groupsService.load().subscribe();
            },
            error: (err) => {
                this.confirmingDelete.set(null);
                this.errorMessage.set(apiErrorMessage(err));
            }
        });
    }
}
