import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MIN_PASSWORD_LENGTH } from '../models/auth.model';
import { AuthService } from '../services/auth.service';

@Component({
    imports: [ReactiveFormsModule, RouterLink],
    selector: 'app-register-component',
    styleUrl: '../shared/auth-card.css',
    templateUrl: './register-component.html',
})
export class RegisterComponent {
    private auth = inject(AuthService);
    private router = inject(Router);

    submitting = signal(false);
    errorMessage = signal('');

    registerForm = new FormGroup({
        username: new FormControl('', { nonNullable: true, validators: Validators.required }),
        email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
        password: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]
        })
    });

    onSubmit(){
        if (this.registerForm.invalid) {
            this.registerForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.errorMessage.set('');

        this.auth.register(this.registerForm.getRawValue()).subscribe({
            next: () => this.router.navigate(['/']),
            error: (err: HttpErrorResponse) => {
                this.submitting.set(false);
                this.errorMessage.set(this.messageFor(err));
            }
        });
    }

    usernameError(): string {
        const username = this.registerForm.controls.username;
        return username.touched && username.invalid ? 'Choose a username.' : '';
    }

    emailError(): string {
        const email = this.registerForm.controls.email;
        if (!email.touched || email.valid) return '';
        return email.hasError('required') ? 'Enter your email.' : 'Enter a valid email address.';
    }

    passwordError(): string {
        const password = this.registerForm.controls.password;
        if (!password.touched || password.valid) return '';
        return password.hasError('required')
            ? 'Choose a password.'
            : `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    private messageFor(err: HttpErrorResponse): string {
        if (err.status === 409) {
            const message = err.error?.message;
            return typeof message === 'string' && message ? message : 'That username or email is already taken.';
        }
        // 0 is a failed request; 502-504 is what a proxy answers when the backend behind it is down
        if ([0, 502, 503, 504].includes(err.status)) return "Can't reach the server. Try again in a moment.";
        return 'Something went wrong. Please try again.';
    }
}
