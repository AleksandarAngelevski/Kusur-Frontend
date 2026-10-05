import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
    let client: HttpClient;
    let http: HttpTestingController;
    let auth: AuthService;
    let navigate: ReturnType<typeof vi.spyOn>;

    const unauthorized = { status: 401, statusText: 'Unauthorized' };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
        });
        client = TestBed.inject(HttpClient);
        http = TestBed.inject(HttpTestingController);
        auth = TestBed.inject(AuthService);
        navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        auth.token.set('old.token');
    });

    afterEach(() => http.verify());

    it('should send the access token with API calls', () => {
        client.get('/api/groups').subscribe();

        const req = http.expectOne('/api/groups');
        expect(req.request.headers.get('Authorization')).toBe('Bearer old.token');
        req.flush([]);
    });

    it('should leave the auth endpoints alone: no token, and a 401 is just an answer', () => {
        let status = 0;
        client.post('/api/auth/login', {}).subscribe({ error: (err) => (status = err.status) });

        const req = http.expectOne('/api/auth/login');
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush({}, unauthorized);

        expect(status).toBe(401);
        expect(auth.token()).toBe('old.token');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('should get a new token and repeat the call when the old one has expired', () => {
        let result: unknown;
        client.get('/api/groups').subscribe((body) => (result = body));

        http.expectOne('/api/groups').flush({}, unauthorized);
        http.expectOne({ method: 'POST', url: '/api/auth/refresh' }).flush({ token: 'new.token' });
        const retry = http.expectOne('/api/groups');
        expect(retry.request.headers.get('Authorization')).toBe('Bearer new.token');
        retry.flush(['a group']);

        expect(result).toEqual(['a group']);
        expect(auth.token()).toBe('new.token');
        expect(navigate).not.toHaveBeenCalled();
    });

    it('should refresh once for several calls that expire together', () => {
        client.get('/api/groups').subscribe();
        client.get('/api/users/me').subscribe();

        http.expectOne('/api/groups').flush({}, unauthorized);
        http.expectOne('/api/users/me').flush({}, unauthorized);
        http.expectOne('/api/auth/refresh').flush({ token: 'new.token' });

        http.expectOne('/api/groups').flush([]);
        http.expectOne('/api/users/me').flush({});
    });

    it('should sign out and go to the login page when the session cannot be renewed', () => {
        let status = 0;
        client.get('/api/groups').subscribe({ error: (err) => (status = err.status) });

        http.expectOne('/api/groups').flush({}, unauthorized);
        http.expectOne('/api/auth/refresh').flush({}, unauthorized);

        expect(status).toBe(401);
        expect(auth.isLoggedIn()).toBe(false);
        expect(navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should sign out rather than loop when the call is refused even with a new token', () => {
        client.get('/api/groups').subscribe({ error: () => {} });

        http.expectOne('/api/groups').flush({}, unauthorized);
        http.expectOne('/api/auth/refresh').flush({ token: 'new.token' });
        http.expectOne('/api/groups').flush({}, unauthorized);

        expect(auth.isLoggedIn()).toBe(false);
        expect(navigate).toHaveBeenCalledWith(['/login']);
    });

    it('should pass other errors through untouched', () => {
        let status = 0;
        client.get('/api/groups').subscribe({ error: (err) => (status = err.status) });

        http.expectOne('/api/groups').flush({}, { status: 500, statusText: 'Server Error' });

        expect(status).toBe(500);
        expect(auth.token()).toBe('old.token');
    });
});
