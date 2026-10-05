import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
    let auth: AuthService;

    const runGuard = () =>
        TestBed.runInInjectionContext(() =>
            authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
        );

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideRouter([])],
        });
        auth = TestBed.inject(AuthService);
    });

    it('should allow the route when a token is present', () => {
        auth.token.set('some.jwt.token');

        expect(runGuard()).toBe(true);
    });

    it('should redirect to /login when there is no token', () => {
        auth.token.set(null);

        const result = runGuard();

        expect(result).toBeInstanceOf(UrlTree);
        expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/login');
    });
});
