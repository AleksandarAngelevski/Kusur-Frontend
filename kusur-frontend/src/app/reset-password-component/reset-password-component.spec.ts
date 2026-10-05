import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ResetPasswordComponent } from './reset-password-component';

describe('ResetPasswordComponent', () => {
    let fixture: ComponentFixture<ResetPasswordComponent>;
    let http: HttpTestingController;
    let el: HTMLElement;

    const fieldErrors = () =>
        Array.from(el.querySelectorAll('.field-error')).map((p) => p.textContent?.trim());

    const type = async (id: string, value: string) => {
        const input = el.querySelector<HTMLInputElement>(`#${id}`)!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        await fixture.whenStable();
    };

    const submit = async () => {
        el.querySelector('form')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    };

    const fillValid = async () => {
        await type('password', 'longenough');
        await type('confirm', 'longenough');
    };

    /** Renders the page as if opened from /reset-password with the given query string. */
    const open = async (query: Record<string, string>) => {
        await TestBed.configureTestingModule({
            imports: [ResetPasswordComponent],
            providers: [
                provideRouter([]),
                provideHttpClient(),
                provideHttpClientTesting(),
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ResetPasswordComponent);
        http = TestBed.inject(HttpTestingController);
        el = fixture.nativeElement;
        await fixture.whenStable();
    };

    afterEach(() => http.verify());

    describe('without a token in the link', () => {
        beforeEach(() => open({}));

        it('should show the invalid-link message and no form', () => {
            expect(el.querySelector('form')).toBeNull();
            expect(el.querySelector('h1')?.textContent).toContain("This link doesn't work");
            expect(el.querySelector('.footer a')?.getAttribute('href')).toBe('/forgot-password');
        });
    });

    describe('with a token in the link', () => {
        beforeEach(() => open({ token: 'reset-token' }));

        it('should show the form with no validation messages', () => {
            expect(el.querySelector('form')).toBeTruthy();
            expect(fieldErrors()).toEqual([]);
        });

        it('should show a message per field and send nothing when submitted empty', async () => {
            await submit();

            expect(fieldErrors()).toEqual(['Choose a password.', 'Repeat your password.']);
            http.expectNone('/api/auth/reset-password');
        });

        it('should reject a short password', async () => {
            await type('password', 'short');
            await type('confirm', 'short');
            await submit();

            expect(fieldErrors()).toEqual(['Use at least 8 characters.']);
            http.expectNone('/api/auth/reset-password');
        });

        it('should reject passwords that do not match', async () => {
            await type('password', 'longenough');
            await type('confirm', 'different1');
            await submit();

            expect(fieldErrors()).toEqual(["Passwords don't match."]);
            http.expectNone('/api/auth/reset-password');
        });

        it('should post the token and new password, then confirm', async () => {
            await fillValid();
            await submit();

            const req = http.expectOne('/api/auth/reset-password');
            expect(req.request.body).toEqual({ token: 'reset-token', newPassword: 'longenough' });
            req.flush(null, { status: 204, statusText: 'No Content' });
            await fixture.whenStable();

            expect(el.querySelector('form')).toBeNull();
            expect(el.querySelector('h1')?.textContent).toContain('Password updated');
            expect(el.querySelector('.footer a')?.getAttribute('href')).toBe('/login');
        });

        it('should show the invalid-link message when the backend rejects the token', async () => {
            await fillValid();
            await submit();

            http.expectOne('/api/auth/reset-password').flush(
                { message: 'Token expired' },
                { status: 400, statusText: 'Bad Request' }
            );
            await fixture.whenStable();

            expect(el.querySelector('form')).toBeNull();
            expect(el.querySelector('h1')?.textContent).toContain("This link doesn't work");
        });

        it('should keep the form and say the server is unreachable on a 502', async () => {
            await fillValid();
            await submit();

            http.expectOne('/api/auth/reset-password').flush('', { status: 502, statusText: 'Bad Gateway' });
            await fixture.whenStable();

            expect(el.querySelector('form')).toBeTruthy();
            expect(el.querySelector('.error')?.textContent).toContain("Can't reach the server.");
        });
    });
});
