import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { TutorService, TutorFilters } from '../tutor';
import { SubjectService, Subject } from '../../subjects/subject';
import { TutorCard } from '../tutor-card/tutor-card';

@Component({
  selector: 'app-tutor-search-form',
  imports: [ReactiveFormsModule, TutorCard],
  templateUrl: './tutor-search.html', 
  styleUrl: './tutor-search.css',
})
export class TutorSearchForm implements OnInit {
  private formBuilder = inject(FormBuilder);
  private tutorService = inject(TutorService);
  private subjectService = inject(SubjectService);

  subjects = signal<Subject[]>([]);
  tutors = this.tutorService.tutors;

  // T4: Search filters are optional
  searchForm = this.formBuilder.nonNullable.group({
    subject: [''],
    minPrice: [''],
    maxPrice: [''],
    minRating: [''],
    availableThisWeek: [false]
  });

  ngOnInit(): void {
    // T4: Load subjects for the dropdown
    this.subjectService.getAll().subscribe({
      next: (subjects) => this.subjects.set(subjects),
      error: (err) => console.error('Could not load subjects.', err)
    });

    // T4: Show all tutors before selecting filters
    this.onSearch();
  }

  // T4: Send selected filters to TutorService
  onSearch(): void {
    const values = this.searchForm.getRawValue();
    const filters: TutorFilters = {
      subject: values.subject,
      minPrice: values.minPrice === null || 
        values.minPrice ===  '' ? null : Number(values.minPrice),
      maxPrice: values.maxPrice === null || 
        values.maxPrice === '' ? null : Number(values.maxPrice),
      minRating: values.minRating === null || 
        values.minRating === '' ? null : Number(values.minRating),
      availableThisWeek: values.availableThisWeek
    };
    this.tutorService.loadTutors(filters);
  }

  // T4: Reset all filters and reload all tutors
  clearFilters(): void {
    this.searchForm.reset();
    this.onSearch();
  }
}
