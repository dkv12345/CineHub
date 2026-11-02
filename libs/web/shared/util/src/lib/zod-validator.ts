import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { ZodType, ZodObject, ZodRawShape } from 'zod';

/**
 * Adapts a single Zod field or object schema into an Angular Reactive Forms `ValidatorFn`.
 * Enables 100% contract sharing with `@cinehub/contracts` without duplicating rules.
 */
export function zodFieldValidator<T>(schema: ZodType<T>): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const result = schema.safeParse(control.value);
    if (result.success) {
      return null;
    }
    const firstIssue = result.error.issues[0];
    return {
      zod: firstIssue?.message ?? 'Invalid value',
    };
  };
}

/**
 * Adapts a Zod object schema into a form-group level `ValidatorFn` that maps
 * field-level errors onto individual child controls and returns group-level errors.
 */
export function zodFormGroupValidator<T extends ZodRawShape>(schema: ZodObject<T>): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const result = schema.safeParse(group.value);
    if (result.success) {
      return null;
    }
    const errors: ValidationErrors = {};
    for (const issue of result.error.issues) {
      const key = String(issue.path[0] ?? 'form');
      if (!errors[key]) {
        errors[key] = issue.message;
      }
    }
    return errors;
  };
}
