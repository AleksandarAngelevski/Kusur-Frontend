import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MIN_PASSWORD_LENGTH } from '../models/auth.model';
import { AuthService } from '../services/auth.service';
import { apiErrorMessage } from '../shared/api-error';

const passwordsMatch = (group: AbstractControl): ValidationErrors | null =>
    group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true };

@Component({
    imports: [ReactiveFormsModule, RouterLink],
    selector: 'app-reset-password-component',
    styleUrl: '../shared/auth-card.css',
    templateUrl: './reset-password-component.html',
})
export class ResetPasswordComponent {
    private auth = inject(AuthService);

    /** comes from the emailed link: /reset-password?token=... */
    private token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';

    submitting = signal(false);
    errorMessage = signal('');
    done = signal(false);
    /** no token in the link, or the backend rejected it as invalid or expired */
    linkInvalid = signal(!this.token);

    resetForm = new FormGroup({
        password: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]
        }),
        confirm: new FormControl('', { nonNullable: true, validators: Validators.required })
    }, { validators: passwordsMatch });

    onSubmit(){
        if (this.resetForm.invalid) {
            this.resetForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.errorMessage.set('');

        this.auth.resetPassword(this.token, this.resetForm.controls.password.value).subscribe({
            next: () => {
                this.submitting.set(false);
                this.done.set(true);
            },
            error: (err: HttpErrorResponse) => {
                this.submitting.set(false);
                if (err.status === 400) {
                    this.linkInvalid.set(true);
                } else {
                    this.errorMessage.set(this.messageFor(err));
                }
            }
        });
    }

    passwordError(): string {
        const password = this.resetForm.controls.password;
        if (!password.touched || password.valid) return '';
        return password.hasError('required')
            ? 'Choose a password.'
            : `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }

    confirmError(): string {
        const confirm = this.resetForm.controls.confirm;
        if (!confirm.touched) return '';
        if (confirm.hasError('required')) return 'Repeat your password.';
        return this.resetForm.hasError('mismatch') ? "Passwords don't match." : '';
    }

    private messageFor(err: HttpErrorResponse): string {
        // the backend limits how often these endpoints may be tried, and says how long to wait
        if (err.status === 429) return apiErrorMessage(err, 'Too many attempts. Try again in a few minutes.');
        // 0 is a failed request; 502-504 is what a proxy answers when the backend behind it is down
        if ([0, 502, 503, 504].includes(err.status)) return "Can't reach the server. Try again in a moment.";
        return 'Something went wrong. Please try again.';
    }
}
