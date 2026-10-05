import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
    imports: [ReactiveFormsModule],
    selector: 'app-login-component',
    styleUrl: './login-component.css',
    templateUrl: './login-component.html',
})
export class LoginComponent {
    private auth = inject(AuthService);
    private router = inject(Router);

    submitting = signal(false);
    errorMessage = signal('');

    loginForm = new FormGroup({
        email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
        password: new FormControl('', { nonNullable: true, validators: Validators.required })
    });

    onSubmit(){
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.errorMessage.set('');

        this.auth.login(this.loginForm.getRawValue()).subscribe({
            next: () => this.router.navigate(['/']),
            error: (err: HttpErrorResponse) => {
                this.submitting.set(false);
                this.errorMessage.set(this.messageFor(err));
            }
        });
    }

    emailError(): string {
        const email = this.loginForm.controls.email;
        if (!email.touched || email.valid) return '';
        return email.hasError('required') ? 'Enter your email.' : 'Enter a valid email address.';
    }

    passwordError(): string {
        const password = this.loginForm.controls.password;
        return password.touched && password.invalid ? 'Enter your password.' : '';
    }

    private messageFor(err: HttpErrorResponse): string {
        if (err.status === 401 || err.status === 403) return 'Wrong email or password.';
        // 0 is a failed request; 502-504 is what a proxy answers when the backend behind it is down
        if ([0, 502, 503, 504].includes(err.status)) return "Can't reach the server. Try again in a moment.";
        return 'Something went wrong. Please try again.';
    }
}
