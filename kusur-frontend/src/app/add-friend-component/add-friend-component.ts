import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { apiErrorMessage } from '../shared/api-error';
import { notBlank } from '../shared/validators';

/** Opens a tab with one friend, for expenses that need no group, and goes straight to it. */
@Component({
    imports: [ReactiveFormsModule, RouterLink],
    selector: 'app-add-friend-component',
    styleUrl: '../shared/app-form.css',
    templateUrl: './add-friend-component.html',
})
export class AddFriendComponent {
    private groups = inject(GroupsService);
    private router = inject(Router);

    friendForm = new FormGroup({
        identifier: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank] })
    });

    submitting = signal(false);
    errorMessage = signal('');

    onSubmit(){
        if (this.friendForm.invalid) {
            this.friendForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.errorMessage.set('');

        // the backend says when nobody has that username or email; a friend I already have just opens their tab
        this.groups.addFriend(this.friendForm.controls.identifier.value).subscribe({
            next: (tab) => this.router.navigate(['/groups', tab.id]),
            error: (err) => {
                this.submitting.set(false);
                this.errorMessage.set(apiErrorMessage(err));
            }
        });
    }

    identifierError(): string {
        const identifier = this.friendForm.controls.identifier;
        return identifier.touched && identifier.invalid ? 'Enter a username or email.' : '';
    }
}
