import { Component, inject, input, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BookingService, ReviewPayload } from '../booking';

@Component({
  selector: 'app-booking-review',
  imports: [ReactiveFormsModule],
  templateUrl: './booking-review.html',
  styleUrl: './booking-review.css'
})
export class BookingReview {
  private bookingService = inject(BookingService);
  private formBuilder = inject(FormBuilder);

  // T8: Booking ID passed from MyBookings
  bookingId = input.required<string>();
  ratings = [1, 2, 3, 4, 5];

  // T8: Review form with validation
  reviewForm = this.formBuilder.nonNullable.group({
    rating: ['', Validators.required],
    comment: ['', Validators.maxLength(500)]
  });

  sending = signal(false);
  submittedReview = signal<ReviewPayload | null>(null);
  hasReviewedMessage = signal('');
  errorMessage = signal('');

  // T8: Submit review to backend
  onSubmit(): void {
    if (this.reviewForm.invalid) {
      this.reviewForm.markAllAsTouched();
      return;
    }
    // T8: Cannot submit form twice 
    if (this.sending() || this.submittedReview() ||
        this.hasReviewedMessage()) {
      return;
    }
    this.sending.set(true);
    this.errorMessage.set('');

    const values = this.reviewForm.getRawValue();
    const payload: ReviewPayload = {
      rating: Number(values.rating),
      comment: values.comment
    }; 
    this.bookingService.submitReview(this.bookingId(), payload)
      .subscribe({ next: () => {
        // T8: (201) Replace form with submitted review
        this.submittedReview.set(payload);
        this.sending.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          // T8: (409) show error and swap form out 
          this.hasReviewedMessage.set(
            err.error?.error ?? 'You have already reviewed this session.'
          );
        } else {
          this.errorMessage.set(
            err.error?.error ?? 'Could not submit review.'
          );
        }
        this.sending.set(false);
      }
    });
  }
}
