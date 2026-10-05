import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Role } from './groups.api';

/** An account as an admin sees it. */
export interface AdminUser {
    id: number;
    username: string;
    email: string;
    role: Role;
    enabled: boolean;
}

/** The parts of a group the admin page shows. The backend sends the whole group; the rest is ignored. */
export interface AdminGroup {
    id: number;
    name: string;
    ownerId: number;
    members: { id: number; name: string }[];
    formerMembers: { id: number; name: string }[];
    expenses: unknown[];
    settlements: unknown[];
}

/** The backend's admin-only endpoints. They answer 403 for anyone who is not an admin. */
@Injectable({ providedIn: 'root' })
export class AdminApi {
    private http = inject(HttpClient);

    users(): Observable<AdminUser[]> {
        return this.http.get<AdminUser[]>('/api/admin/users');
    }

    setRole(userId: number, role: Role): Observable<AdminUser> {
        return this.http.patch<AdminUser>(`/api/admin/users/${userId}/role`, { role });
    }

    /** every group, including ones the admin is not a member of */
    groups(): Observable<AdminGroup[]> {
        return this.http.get<AdminGroup[]>('/api/admin/groups');
    }

    deleteGroup(groupId: number): Observable<void> {
        return this.http.delete<void>(`/api/admin/groups/${groupId}`);
    }
}
