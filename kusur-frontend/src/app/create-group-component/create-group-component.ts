import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { GroupsService } from '../services/groups.service';
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

    onSubmit(){
        if (this.groupForm.invalid) {
            this.groupForm.markAllAsTouched();
            return;
        }

        const group = this.groups.createGroup(this.groupForm.controls.name.value);
        this.router.navigate(['/groups', group.id]);
    }

    nameError(): string {
        const name = this.groupForm.controls.name;
        return name.touched && name.invalid ? 'Give the group a name.' : '';
    }
}
