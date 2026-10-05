import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.isLoggedIn() ? true : router.createUrlTree(['/login']);
};

/** Keeps signed-in users off the login and register pages. */
export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    return auth.isLoggedIn() ? router.createUrlTree(['/']) : true;
};
