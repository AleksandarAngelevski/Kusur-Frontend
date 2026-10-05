import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LoginComponent } from './login-component';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;
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

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        http = TestBed.inject(HttpTestingController);
        el = fixture.nativeElement;
        await fixture.whenStable();
    });

    afterEach(() => {
        http.verify();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should show no validation messages before the user interacts', () => {
        expect(fieldErrors()).toEqual([]);
    });

    it('should show both messages and send nothing when submitted empty', async () => {
        await submit();

        expect(fieldErrors()).toEqual(['Enter your email.', 'Enter your password.']);
        http.expectNone('/api/auth/login');
    });

    it('should mark an empty field as invalid for assistive tech', async () => {
        await submit();

        const email = el.querySelector('#email')!;
        expect(email.getAttribute('aria-invalid')).toBe('true');
        expect(email.getAttribute('aria-describedby')).toBe('email-error');
        expect(el.querySelector('#email-error')).toBeTruthy();
    });

    it('should ask for a valid address when the email is malformed', async () => {
        await type('email', 'not-an-email');
        await type('password', 'secret');
        await submit();

        expect(fieldErrors()).toEqual(['Enter a valid email address.']);
        http.expectNone('/api/auth/login');
    });

    it('should show a message once an empty field is left', async () => {
        await type('email', '');

        expect(fieldErrors()).toEqual(['Enter your email.']);
    });

    it('should clear the messages once the fields are valid', async () => {
        await submit();
        await type('email', 'ace@example.com');
        await type('password', 'secret');

        expect(fieldErrors()).toEqual([]);
        expect(el.querySelector('#email')!.getAttribute('aria-invalid')).toBeNull();
    });

    it('should post the credentials and go home when the form is valid', async () => {
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        await type('email', 'ace@example.com');
        await type('password', 'secret');
        await submit();

        const req = http.expectOne('/api/auth/login');
        expect(req.request.body).toEqual({ email: 'ace@example.com', password: 'secret' });
        req.flush({ token: 'some.jwt.token' });

        expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it('should show the wrong-credentials message on a 401', async () => {
        await type('email', 'ace@example.com');
        await type('password', 'wrong');
        await submit();

        http.expectOne('/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
        await fixture.whenStable();

        expect(el.querySelector('.error')?.textContent).toContain('Wrong email or password.');
    });

    it.each([0, 502, 503, 504])('should say the server is unreachable on status %i', async (status) => {
        await type('email', 'ace@example.com');
        await type('password', 'secret');
        await submit();

        const req = http.expectOne('/api/auth/login');
        if (status === 0) {
            req.error(new ProgressEvent('error'));
        } else {
            req.flush('', { status, statusText: 'Bad Gateway' });
        }
        await fixture.whenStable();

        expect(el.querySelector('.error')?.textContent).toContain("Can't reach the server.");
    });

    it('should show the generic message on other server errors', async () => {
        await type('email', 'ace@example.com');
        await type('password', 'secret');
        await submit();

        http.expectOne('/api/auth/login').flush('', { status: 500, statusText: 'Server Error' });
        await fixture.whenStable();

        expect(el.querySelector('.error')?.textContent).toContain('Something went wrong.');
    });
});
