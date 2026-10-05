import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { RegisterComponent } from './register-component';

describe('RegisterComponent', () => {
    let component: RegisterComponent;
    let fixture: ComponentFixture<RegisterComponent>;
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
        await type('username', 'ace');
        await type('email', 'ace@example.com');
        await type('password', 'longenough');
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [RegisterComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
        }).compileComponents();

        fixture = TestBed.createComponent(RegisterComponent);
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

    it('should show a message per field and send nothing when submitted empty', async () => {
        await submit();

        expect(fieldErrors()).toEqual(['Choose a username.', 'Enter your email.', 'Choose a password.']);
        http.expectNone('/api/auth/register');
    });

    it('should reject a malformed email and a short password', async () => {
        await type('username', 'ace');
        await type('email', 'not-an-email');
        await type('password', 'short');
        await submit();

        expect(fieldErrors()).toEqual(['Enter a valid email address.', 'Use at least 8 characters.']);
        http.expectNone('/api/auth/register');
    });

    it('should post the details, store the token and go home when the form is valid', async () => {
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
        await fillValid();
        await submit();

        const req = http.expectOne('/api/auth/register');
        expect(req.request.body).toEqual({ username: 'ace', email: 'ace@example.com', password: 'longenough' });
        req.flush({ token: 'some.jwt.token' });

        expect(TestBed.inject(AuthService).token()).toBe('some.jwt.token');
        expect(navigate).toHaveBeenCalledWith(['/']);
    });

    it("should show the server's message when the username or email is taken", async () => {
        await fillValid();
        await submit();

        http.expectOne('/api/auth/register').flush(
            { message: 'Username already taken' },
            { status: 409, statusText: 'Conflict' }
        );
        await fixture.whenStable();

        expect(el.querySelector('.error')?.textContent).toContain('Username already taken');
    });

    it('should fall back to a default message on a 409 without one', async () => {
        await fillValid();
        await submit();

        http.expectOne('/api/auth/register').flush('', { status: 409, statusText: 'Conflict' });
        await fixture.whenStable();

        expect(el.querySelector('.error')?.textContent).toContain('That username or email is already taken.');
    });

    it('should say the server is unreachable when the proxy returns 502', async () => {
        await fillValid();
        await submit();

        http.expectOne('/api/auth/register').flush('', { status: 502, statusText: 'Bad Gateway' });
        await fixture.whenStable();

        expect(el.querySelector('.error')?.textContent).toContain("Can't reach the server.");
    });

    it('should link back to the login page', () => {
        expect(el.querySelector('.footer a')?.getAttribute('href')).toBe('/login');
    });
});
