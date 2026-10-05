import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Sends the access token with API calls. When the backend answers 401 because the token has
 * expired, it gets a new one with the refresh cookie and repeats the call once; only if that
 * fails too is the user signed out and sent to the login page.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    // the auth endpoints are called signed out, and a 401 there just means the request was rejected
    if (req.url.startsWith('/api/auth/')) {
        return next(req);
    }

    const withToken = (request: HttpRequest<unknown>, token: string | null) =>
        token && request.url.startsWith('/api/')
            ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
            : request;

    const signOut = (err: unknown) => {
        auth.clear();
        router.navigate(['/login']);
        return throwError(() => err);
    };

    return next(withToken(req, auth.token())).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status !== 401) {
                return throwError(() => err);
            }
            return auth.refresh().pipe(
                // no usable refresh cookie: the session is over
                catchError(() => signOut(err)),
                switchMap((token) => next(withToken(req, token))),
                // still refused with a fresh token: treat it the same way rather than loop
                catchError((retryErr: HttpErrorResponse) => (retryErr.status === 401 ? signOut(retryErr) : throwError(() => retryErr)))
            );
        })
    );
};
