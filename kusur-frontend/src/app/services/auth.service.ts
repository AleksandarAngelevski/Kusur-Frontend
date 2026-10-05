import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay, tap } from 'rxjs';
import { ForgotPasswordRequest, LoginRequest, LoginResponse, RegisterRequest, ResetPasswordRequest } from '../models/auth.model';

/**
 * Who is signed in.
 *
 * The access token is short-lived and kept only in memory. What keeps the user signed in across
 * reloads is a refresh token the backend sets in an httpOnly cookie, which page scripts cannot
 * read: restore() swaps it for an access token when the app starts, and the HTTP interceptor
 * does the same whenever the access token has expired.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);

    token = signal<string | null>(null);
    isLoggedIn = computed(() => !!this.token());

    /** the refresh call in flight, shared so that several expired requests cause only one */
    private refreshing?: Observable<string>;

    /** The token's subject, which the backend sets to the username. Null when signed out or the token can't be read. */
    username = computed(() => {
        const payload = this.token()?.split('.')[1];
        if (!payload) return null;
        try {
            // JWT segments are base64url; decode as UTF-8 so non-Latin usernames survive
            const bytes = Uint8Array.from(atob(payload.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
            const subject = JSON.parse(new TextDecoder().decode(bytes)).sub;
            return typeof subject === 'string' ? subject : null;
        } catch {
            return null;
        }
    });

    constructor() {
        // earlier versions kept the token here; make sure an old one does not linger
        try {
            localStorage.removeItem('token');
        } catch {
            // storage unavailable (e.g. private window); nothing to clean up
        }
    }

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>('/api/auth/login', request).pipe(
            tap((response) => this.token.set(response.token))
        );
    }

    /** The backend signs the new user in straight away, so register answers with a token like login does. */
    register(request: RegisterRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>('/api/auth/register', request).pipe(
            tap((response) => this.token.set(response.token))
        );
    }

    /**
     * Gets a new access token for the browser's refresh cookie. Fails when there is no valid
     * cookie, i.e. the user is signed out. Calls made while one is in flight share its answer.
     */
    refresh(): Observable<string> {
        this.refreshing ??= this.http.post<LoginResponse>('/api/auth/refresh', {}).pipe(
            map((response) => response.token),
            tap((token) => this.token.set(token)),
            finalize(() => (this.refreshing = undefined)),
            shareReplay(1)
        );
        return this.refreshing;
    }

    /** Signs the user back in after a page load if their refresh cookie is still good. Never fails. */
    restore(): Observable<boolean> {
        return this.refresh().pipe(
            map(() => true),
            catchError(() => of(false))
        );
    }

    /** Asks the backend to email a reset link. It answers the same way whether or not the address has an account. */
    requestPasswordReset(email: string): Observable<void> {
        const request: ForgotPasswordRequest = { email };
        return this.http.post<void>('/api/auth/forgot-password', request);
    }

    /** Sets a new password using the token from the emailed reset link. Does not sign the user in. */
    resetPassword(token: string, newPassword: string): Observable<void> {
        const request: ResetPasswordRequest = { token, newPassword };
        return this.http.post<void>('/api/auth/reset-password', request);
    }

    /** Signs out here at once, and tells the backend to end the session and clear the cookie. */
    logout(): void {
        this.clear();
        // if this fails the cookie outlives the click, but nothing on this page can use it any more
        this.http.post<void>('/api/auth/logout', {}).subscribe({ error: () => {} });
    }

    /** Forgets the access token without calling the backend, for when the session is already gone there. */
    clear(): void {
        this.token.set(null);
    }
}
