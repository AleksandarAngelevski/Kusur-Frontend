import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { GroupDetails } from '../models/group.model';
import { fromWire, GroupWire, Role } from './groups.api';

/** An account as an admin sees it. */
export interface AdminUser {
    id: number;
    username: string;
    email: string;
    role: Role;
    enabled: boolean;
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

    /**
     * Deletes an account. The backend scrubs it rather than removing its history: its groups pass to
     * another member (or go, if it was alone in them) and its expenses stay under "Deleted user".
     */
    deleteUser(userId: number): Observable<void> {
        return this.http.delete<void>(`/api/admin/users/${userId}`);
    }

    /** every group, including ones the admin is not a member of */
    groups(): Observable<GroupDetails[]> {
        return this.http.get<GroupWire[]>('/api/admin/groups').pipe(map((groups) => groups.map(fromWire)));
    }

    deleteGroup(groupId: number): Observable<void> {
        return this.http.delete<void>(`/api/admin/groups/${groupId}`);
    }
}
