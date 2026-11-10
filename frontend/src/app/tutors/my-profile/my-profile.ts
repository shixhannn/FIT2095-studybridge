import { Component, inject, signal, HostListener } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../auth/auth.service';
import { Subject, SubjectService } from '../../subjects/subject';
import { TutorService, TutorProfilePayload } from '../tutor';

@Component({
  selector: 'app-my-profile',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './my-profile.html', 
  styleUrl: './my-profile.css'
})
export class MyProfileComponent {
  private formBuilder = inject(FormBuilder);
  private auth = inject(AuthService);
  private subjectService = inject(SubjectService);
  private tutorService = inject(TutorService);

  subjects = signal<Subject[]>([]);
  loading = signal(true);
  loadFailed = signal(false);
  saving = signal(false);
  hasProfile = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  // T5: Tutor profile edit form with validation
  profileForm = this.formBuilder.group({
    bio: ['', Validators.maxLength(500)],
    hourlyRate: [5, [Validators.required, Validators.min(5), Validators.max(200)]],
    subjects: [[] as string[], Validators.required]
  });

  constructor() {
    this.loadProfile();
  }

  // T5: Load subject catalogue, then own profile
  loadProfile(): void {
    // reset before loading 
    this.loading.set(true);
    this.loadFailed.set(false);
    this.errorMessage.set('');
    this.successMessage.set('');

    // (T3) Get all subjects 
    this.subjectService.getAll().subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        const userId = this.auth.currentUser()?.userId;
        if (!userId) {
          this.errorMessage.set('Unable to identify the current tutor.');
          this.loadFailed.set(true);
          this.loading.set(false);
          return;
        }

        // (T4) Check if tutor has profile
        this.tutorService.getTutor(userId).subscribe({
          next: (profile) => {
            this.hasProfile.set(true);

            // Match subject name with ID
            const selectedIds = subjects
              .filter(subject => profile.subjects.some(
                  name => name.toLowerCase() === subject.name.toLowerCase()
                )
              )
              .map(subject => subject._id);

            // Stop if some subjects cannot match
            if (selectedIds.length !== profile.subjects.length) {
              this.errorMessage.set('Some saved subjects could not be matched.');
              this.loadFailed.set(true);
              this.loading.set(false);
              return;
            }

            // T5: Fill form with tutor's information
            this.profileForm.setValue({
              bio: profile.bio,
              hourlyRate: profile.hourlyRate,
              subjects: selectedIds
            });
            this.loading.set(false);
          },

          // handle error when loading tutor profile
          error: (err: HttpErrorResponse) => {
            if (err.status === 404) {
              // No profile yet, so create form 
              this.hasProfile.set(false);
              this.profileForm.reset({
                bio: '', hourlyRate: null, subjects: []
              });
            } else {
              this.errorMessage.set(err.error?.error ?? 
                'Could not load your profile.');
              this.loadFailed.set(true);
            }
            this.loading.set(false);
          }
        });
      },

      // handle error when loading subject catalogue 
      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.error ?? 'Could not load subjects.'
        );
        this.loadFailed.set(true);
        this.loading.set(false);
      }
    });
  }

  // Dropdown
  subjectsDropdownOpen = signal(false);

  toggleSubjectsDropdown(): void {
    this.subjectsDropdownOpen.update(open => !open);
  }

  toggleSubject(subjectId: string): void {
    const selected = this.profileForm.controls.subjects.value ?? [];

    const updated = selected.includes(subjectId)
      ? selected.filter(id => id !== subjectId)
      : [...selected, subjectId];

    this.profileForm.controls.subjects.setValue(updated);
    this.profileForm.controls.subjects.markAsTouched();
  }

  isSubjectSelected(subjectId: string): boolean {
    return (this.profileForm.controls.subjects.value ?? []).includes(subjectId);
  }

  getSelectedSubjectsLabel(): string {
    const selected = this.profileForm.controls.subjects.value ?? [];

    if (selected.length === 0) return 'Select subjects';
    if (selected.length === 1) {
      return this.subjects().find(s => s._id === selected[0])?.name ?? '1 subject selected';
    }

    return `${selected.length} subjects selected`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.subjects-dropdown')) {
      this.subjectsDropdownOpen.set(false);
    }
  }

  // T5: POST for new profile, PUT for existing
  onSubmit(): void {
    this.errorMessage.set('');  // clear message
    this.successMessage.set('');
    // prevent saving while loading 
    if (this.loading() || this.loadFailed() || this.saving()) {
      return;
    }

    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    // T5: Get from values and data 
    const formValue = this.profileForm.getRawValue();
    const payload: TutorProfilePayload = {
      bio: formValue.bio ?? '',
      hourlyRate: formValue.hourlyRate!,
      subjects: formValue.subjects ?? []  
    };

    // T5: Profile exists use PUT, new profile use POST 
    const isEditing = this.hasProfile();
    const request = isEditing
      ? this.tutorService.updateProfile(payload)
      : this.tutorService.createProfile(payload);
    this.saving.set(true);
    request.subscribe({
      // Backend successfully created or updated profile
      next: () => {
        this.hasProfile.set(true);
        this.successMessage.set(
          isEditing ? 'Profile updated successfully.' : 'Profile created successfully.'
        );
        this.saving.set(false);
      },

      error: (err: HttpErrorResponse) => {
        this.errorMessage.set(
          err.error?.error ?? 'Could not save profile.'
        );
        this.saving.set(false);
      }
    });
  }
}
