import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ForgotPasswordRequest, LoginRequest, LoginResponse, RegisterRequest, ResetPasswordRequest } from '../models/auth.model';

const TOKEN_KEY = 'token';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);

    token = signal<string | null>(this.readToken());
    isLoggedIn = computed(() => !!this.token());

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

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>('/api/auth/login', request).pipe(
            tap((response) => this.saveToken(response.token))
        );
    }

    /** The backend signs the new user in straight away, so register answers with a token like login does. */
    register(request: RegisterRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>('/api/auth/register', request).pipe(
            tap((response) => this.saveToken(response.token))
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

    logout(): void {
        this.token.set(null);
        try {
            localStorage.removeItem(TOKEN_KEY);
        } catch {
            // storage unavailable (e.g. private window); the signal is already cleared
        }
    }

    private saveToken(token: string): void {
        this.token.set(token);
        try {
            localStorage.setItem(TOKEN_KEY, token);
        } catch {
            // storage unavailable; the user stays logged in until the page reloads
        }
    }

    private readToken(): string | null {
        try {
            return localStorage.getItem(TOKEN_KEY);
        } catch {
            return null;
        }
    }
}
