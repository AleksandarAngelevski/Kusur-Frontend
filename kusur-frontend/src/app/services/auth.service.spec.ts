import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let auth: AuthService;
    let http: HttpTestingController;

    beforeEach(() => {
        localStorage.setItem('token', 'left.over.token');
        TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
        auth = TestBed.inject(AuthService);
        http = TestBed.inject(HttpTestingController);
    });

    afterEach(() => http.verify());

    it('should start signed out and clear a token an older version left in local storage', () => {
        expect(auth.isLoggedIn()).toBe(false);
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('should keep the access token in memory only after signing in', () => {
        auth.login({ email: 'ace@example.com', password: 'secret' }).subscribe();
        http.expectOne('/api/auth/login').flush({ token: 'access.one' });

        expect(auth.token()).toBe('access.one');
        expect(localStorage.getItem('token')).toBeNull();
    });

    it('should restore the session from the refresh cookie', () => {
        let restored: boolean | undefined;
        auth.restore().subscribe((result) => (restored = result));

        const req = http.expectOne({ method: 'POST', url: '/api/auth/refresh' });
        expect(req.request.body).toEqual({});
        req.flush({ token: 'access.two' });

        expect(restored).toBe(true);
        expect(auth.token()).toBe('access.two');
    });

    it('should stay signed out, without failing, when there is no session to restore', () => {
        let restored: boolean | undefined;
        auth.restore().subscribe((result) => (restored = result));
        http.expectOne('/api/auth/refresh').flush({ message: 'Not signed in' }, { status: 401, statusText: 'Unauthorized' });

        expect(restored).toBe(false);
        expect(auth.isLoggedIn()).toBe(false);
    });

    it('should make one refresh call for several callers at once, then a new one next time', () => {
        const tokens: string[] = [];
        auth.refresh().subscribe((token) => tokens.push(token));
        auth.refresh().subscribe((token) => tokens.push(token));
        http.expectOne('/api/auth/refresh').flush({ token: 'access.three' });
        expect(tokens).toEqual(['access.three', 'access.three']);

        auth.refresh().subscribe((token) => tokens.push(token));
        http.expectOne('/api/auth/refresh').flush({ token: 'access.four' });
        expect(tokens.at(-1)).toBe('access.four');
    });

    it('should sign out at once and tell the backend, even if that call fails', () => {
        auth.token.set('access.one');

        auth.logout();

        expect(auth.isLoggedIn()).toBe(false);
        http.expectOne({ method: 'POST', url: '/api/auth/logout' }).flush('', { status: 502, statusText: 'Bad Gateway' });
        expect(auth.isLoggedIn()).toBe(false);
    });
});
