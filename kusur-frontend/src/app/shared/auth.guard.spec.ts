import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('route guards', () => {
    let auth: AuthService;

    const run = (guard: CanActivateFn) =>
        TestBed.runInInjectionContext(() =>
            guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
        );

    const urlOf = (result: unknown) => {
        expect(result).toBeInstanceOf(UrlTree);
        return TestBed.inject(Router).serializeUrl(result as UrlTree);
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideRouter([])],
        });
        auth = TestBed.inject(AuthService);
    });

    describe('authGuard', () => {
        it('should allow the route when a token is present', () => {
            auth.token.set('some.jwt.token');

            expect(run(authGuard)).toBe(true);
        });

        it('should redirect to /login when there is no token', () => {
            auth.token.set(null);

            expect(urlOf(run(authGuard))).toBe('/login');
        });
    });

    describe('guestGuard', () => {
        it('should allow the route when there is no token', () => {
            auth.token.set(null);

            expect(run(guestGuard)).toBe(true);
        });

        it('should redirect home when a token is present', () => {
            auth.token.set('some.jwt.token');

            expect(urlOf(run(guestGuard))).toBe('/');
        });
    });
});
