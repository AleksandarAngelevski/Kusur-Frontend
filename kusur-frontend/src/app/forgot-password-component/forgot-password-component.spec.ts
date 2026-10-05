import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgotPasswordComponent } from './forgot-password-component';

describe('ForgotPasswordComponent', () => {
    let component: ForgotPasswordComponent;
    let fixture: ComponentFixture<ForgotPasswordComponent>;
    let http: HttpTestingController;
    let el: HTMLElement;

    const fieldErrors = () =>
        Array.from(el.querySelectorAll('.field-error')).map((p) => p.textContent?.trim());

    const typeEmail = async (value: string) => {
        const input = el.querySelector<HTMLInputElement>('#email')!;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        input.dispatchEvent(new Event('blur'));
        await fixture.whenStable();
    };

    const submit = async () => {
        el.querySelector('form')!.dispatchEvent(new Event('submit'));
        await fixture.whenStable();
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ForgotPasswordComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        fixture = TestBed.createComponent(ForgotPasswordComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    afterEach(() => http.verify());

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should ask for an email and send nothing when submitted empty', async () => {
        await submit();

        expect(fieldErrors()).toEqual(['Enter your email.']);
        http.expectNone('/api/auth/forgot-password');
    });

    it('should reject a malformed email', async () => {
        await typeEmail('not-an-email');
        await submit();

        expect(fieldErrors()).toEqual(['Enter a valid email address.']);
        http.expectNone('/api/auth/forgot-password');
    });

    it('should post the email and replace the form with a confirmation', async () => {
        await typeEmail('ace@example.com');
        await submit();

        const req = http.expectOne('/api/auth/forgot-password');
        expect(req.request.body).toEqual({ email: 'ace@example.com' });
        req.flush(null, { status: 204, statusText: 'No Content' });
        await fixture.whenStable();

        expect(el.querySelector('form')).toBeNull();
        expect(el.querySelector('h1')?.textContent).toContain('Check your email');
        expect(el.querySelector('.notice')?.textContent).toContain('ace@example.com');
    });

    it('should keep the form and show an error when the request fails', async () => {
        await typeEmail('ace@example.com');
        await submit();

        http.expectOne('/api/auth/forgot-password').flush('', { status: 500, statusText: 'Server Error' });
        await fixture.whenStable();

        expect(el.querySelector('form')).toBeTruthy();
        expect(el.querySelector('.error')?.textContent).toContain('Something went wrong.');
    });

    it('should say the server is unreachable when the proxy returns 502', async () => {
        await typeEmail('ace@example.com');
        await submit();

        http.expectOne('/api/auth/forgot-password').flush('', { status: 502, statusText: 'Bad Gateway' });
        await fixture.whenStable();

        expect(el.querySelector('.error')?.textContent).toContain("Can't reach the server.");
    });

    it('should link back to the login page', () => {
        expect(el.querySelector('.footer a')?.getAttribute('href')).toBe('/login');
    });
});
