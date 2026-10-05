import { HttpErrorResponse } from '@angular/common/http';

/**
 * What to tell the user when a backend call fails: the backend's own message when it sent one
 * ({ message }), otherwise the fallback.
 */
export function apiErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
    if (!(err instanceof HttpErrorResponse)) return fallback;
    // 0 is a failed request; 502-504 is what a proxy answers when the backend behind it is down
    if ([0, 502, 503, 504].includes(err.status)) return "Can't reach the server. Try again in a moment.";
    const message = err.error?.message;
    return typeof message === 'string' && message ? message : fallback;
}
