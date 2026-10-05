import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    // the auth endpoints are called signed out, and a 401 there just means the request was rejected
    if (req.url.startsWith('/api/auth/')) {
        return next(req);
    }

    const token = auth.token();
    const authReq = token && req.url.startsWith('/api/')
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next(authReq).pipe(
        catchError((err) => {
            if (err.status === 401) {
                auth.logout();
                router.navigate(['/login']);
            }
            return throwError(() => err);
        })
    );
};
