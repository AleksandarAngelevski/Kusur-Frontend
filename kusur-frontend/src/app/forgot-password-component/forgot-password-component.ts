import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
    imports: [ReactiveFormsModule, RouterLink],
    selector: 'app-forgot-password-component',
    styleUrl: '../shared/auth-card.css',
    templateUrl: './forgot-password-component.html',
})
export class ForgotPasswordComponent {
    private auth = inject(AuthService);

    submitting = signal(false);
    errorMessage = signal('');
    /** the address the link was requested for; set once the request went through */
    sentTo = signal('');

    forgotForm = new FormGroup({
        email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] })
    });

    onSubmit(){
        if (this.forgotForm.invalid) {
            this.forgotForm.markAllAsTouched();
            return;
        }

        const { email } = this.forgotForm.getRawValue();
        this.submitting.set(true);
        this.errorMessage.set('');

        this.auth.requestPasswordReset(email).subscribe({
            next: () => {
                this.submitting.set(false);
                this.sentTo.set(email);
            },
            error: (err: HttpErrorResponse) => {
                this.submitting.set(false);
                this.errorMessage.set(this.messageFor(err));
            }
        });
    }

    emailError(): string {
        const email = this.forgotForm.controls.email;
        if (!email.touched || email.valid) return '';
        return email.hasError('required') ? 'Enter your email.' : 'Enter a valid email address.';
    }

    private messageFor(err: HttpErrorResponse): string {
        // 0 is a failed request; 502-504 is what a proxy answers when the backend behind it is down
        if ([0, 502, 503, 504].includes(err.status)) return "Can't reach the server. Try again in a moment.";
        return 'Something went wrong. Please try again.';
    }
}
