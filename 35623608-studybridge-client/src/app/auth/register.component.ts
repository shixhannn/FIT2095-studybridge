import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { RegisterPayload } from '../models';
import { passwordComplexityValidator } from './password-complexity.validator';

// T1: Register component with reactive forms
@Component({
    selector: 'app-register',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './register.component.html',
    styleUrl: './register.component.css',
})
export class RegisterComponent {
    private formBuilder = inject(FormBuilder);
    private auth = inject(AuthService);
    private router = inject(Router);

    errorMessage = signal<string | null>(null);

    // Validation
    registerForm = this.formBuilder.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, passwordComplexityValidator]],
      role: ['', Validators.required], 
    });

    onSubmit(): void {
      if (this.registerForm.invalid) { 
        this.registerForm.markAllAsTouched();
        return;
      }

      this.errorMessage.set(null);
      // T1: POST /auth/register using AuthService 
      this.auth.register(this.registerForm.getRawValue() as RegisterPayload)
        .subscribe({
        // when backend successful (201), redirect to login 
        next: () => { this.router.navigate(['/login'], {
          queryParams: { registered: 'true' }
          });
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage.set(
            err.error?.error ?? 'Something went wrong. Please try again.'
            );
          }
        });
    }
}