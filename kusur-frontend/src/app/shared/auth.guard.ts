import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { GroupsService } from '../services/groups.service';

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

/** Lets only admins through; everyone else goes home. Guards run before resolvers, so it fetches the role itself. */
export const adminGuard: CanActivateFn = () => {
    const groups = inject(GroupsService);
    const router = inject(Router);

    return groups.ensureLoaded().pipe(map(() => (groups.isAdmin() ? true : router.createUrlTree(['/']))));
};
