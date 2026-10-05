import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { apiErrorMessage } from '../shared/api-error';
import { notBlank } from '../shared/validators';

@Component({
    imports: [ReactiveFormsModule, RouterLink],
    selector: 'app-create-group-component',
    styleUrl: '../shared/app-form.css',
    templateUrl: './create-group-component.html',
})
export class CreateGroupComponent {
    private groups = inject(GroupsService);
    private router = inject(Router);

    groupForm = new FormGroup({
        name: new FormControl('', { nonNullable: true, validators: [Validators.required, notBlank] })
    });

    submitting = signal(false);
    errorMessage = signal('');

    onSubmit(){
        if (this.groupForm.invalid) {
            this.groupForm.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.errorMessage.set('');

        this.groups.createGroup(this.groupForm.controls.name.value).subscribe({
            next: (group) => this.router.navigate(['/groups', group.id]),
            error: (err) => {
                this.submitting.set(false);
                this.errorMessage.set(apiErrorMessage(err));
            }
        });
    }

    nameError(): string {
        const name = this.groupForm.controls.name;
        return name.touched && name.invalid ? 'Give the group a name.' : '';
    }
}
