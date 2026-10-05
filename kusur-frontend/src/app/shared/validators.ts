import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

/** Rejects text that is only whitespace. */
export const notBlank = Validators.pattern(/\S/);

/** Amounts are whole denars. Empty passes, so pair it with Validators.required. */
export const wholeNumber = (control: AbstractControl): ValidationErrors | null =>
    control.value === null || Number.isInteger(control.value) ? null : { wholeNumber: true };
