import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { LoginRequest, LoginResponse } from '../models/auth.model';

const TOKEN_KEY = 'token';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);

    token = signal<string | null>(this.readToken());
    isLoggedIn = computed(() => !!this.token());

    login(request: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>('/api/auth/login', request).pipe(
            tap((response) => this.saveToken(response.token))
        );
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
