import { Component, effect, inject, input, signal, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common'; 
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TutorService, TutorDetail } from '../tutor';
import { AuthService } from '../../auth/auth.service'; 
import { BookingService } from '../../bookings/booking';
import { SubjectService, Subject } from '../../subjects/subject';
import { SocketService } from '../../socket';

@Component({
  selector: 'app-tutor-detail',
  imports: [RouterLink, ReactiveFormsModule, DatePipe],
  templateUrl: './tutor-detail.html', 
  styleUrl: './tutor-detail.css'
})
export class TutorDetailComponent {
  private tutorService = inject(TutorService);
  private subjectService = inject(SubjectService);
  private bookingService = inject(BookingService); 
  private socketService = inject(SocketService);
  private auth = inject(AuthService); 
  private formBuilder = inject(FormBuilder); 
  private router = inject(Router); 

  userId = input.required<string>();  // T4 
  tutor = signal<TutorDetail | null>(null);   // T4
  subjects = signal<Subject[]>([]);   // T6

  // T6: Booking form status
  bookingLoading = signal(false);
  bookingError = signal('');
  
  // T6: Only learners can make bookings
  isLearner = computed(() => 
    this.auth.currentUser()?.role === 'learner'
  );

  // T6: Booking form to select slot and subject 
  bookingForm = this.formBuilder.nonNullable.group({
    slotId: ['', Validators.required],
    subjectName: ['', Validators.required]
  });

  constructor() {
    effect(() => {
      // T4: Reload tutor if userId changes
      this.tutor.set(null);
      this.loadTutor();
    });

    this.loadSubjects();

    // T10: Remove booked slot immediately 
    effect(() => {
      const booked = this.socketService.slotBooked();
      // ignore other tutors 
      if (!booked || booked.tutorId !== this.userId()) return;  
      this.tutor.update(tutor => tutor ? {
        ...tutor,   // keep existing tutor details 
        availableSlots: tutor.availableSlots
          .filter( slot => slot._id !== booked.slotId ) // remove booked slot
      } : tutor);

      // T10: Check if selected slot was booked 
      if (this.bookingForm.controls.slotId.value === booked.slotId) {
        this.bookingForm.patchValue({ slotId: '' });
        this.bookingError.set('This slot has just been booked. Please select another time slot.');
      }
    });

    // T10: Refresh tutor slots after cancelled (GET /tutors/:userId)
    effect(() => {
      const freed = this.socketService.slotFreed();
      if (!freed || freed.tutorId !== this.userId()) return;  
      this.loadTutor();
    });
  }

  // T6: Filter subjects that tutor actually teaches
  tutorSubjects = computed(() => {
    const tutor = this.tutor();
    if (!tutor) { 
      return [] ; 
    }
    return this.subjects().filter(subject => 
      tutor.subjects.includes(subject.name)
    );
  });

  // T4 T6: Load tutor information and available slots 
  private loadTutor() {
    this.tutorService.getTutor(this.userId()).subscribe({
        next: (loaded) => this.tutor.set(loaded),
        error: (err) => console.error('Failed to load tutor', err)
      });
  }

  // T6: Fetch subject catalogue 
  loadSubjects() {
    this.subjectService.getAll().subscribe({
      next: (subjects) => { this.subjects.set(subjects); },
      error: (err: HttpErrorResponse) => {
        this.bookingError.set(
          err.error?.error ?? 'Could not load subjects.'
        );
      }
    });
  }

  // T6: Learner submit booking form 
  onBook() {
    this.bookingError.set('');

    // Avoid non-learners and duplicate submissions
    if (!this.isLearner() || this.bookingLoading()) {
      return;
    }
    // Check both required fields
    if (this.bookingForm.invalid) {
      this.bookingForm.markAllAsTouched();
      return;
    }

    const { slotId, subjectName } = this.bookingForm.getRawValue();
    // Find the selected subject ID
    const subject = this.tutorSubjects().find(
      s => s.name === subjectName
    );
    if (!subject) {
      this.bookingError.set('Please select a valid subject.');
      return;
    }

    // Check that the selected slot is still in the list
    const slot = this.tutor()?.availableSlots.find(
      s => s._id === slotId
    );
    if (!slot || slot.isBooked) {
      this.bookingError.set('Please select an available time slot.');
      return;
    }

    this.bookingLoading.set(true);
    // POST /bookings
    this.bookingService.createBooking({ slotId: slotId, subjectId: subject._id })
      .subscribe({ next: () => {
          this.bookingLoading.set(false);
          // T6: (201) Booking successful redirect to booking list 
          this.router.navigate(['/my-bookings'], { queryParams: { booked: 'true' } });
        },
        error: (err: HttpErrorResponse) => { 
          this.bookingLoading.set(false);
          if (err.status === 409) {
            // T6: Slot was booked by someone else
            this.bookingError.set(
              err.error?.error ?? 'This slot is no longer available. Please select another time.'
            );
            // T6: Clear old selected slot 
            this.bookingForm.patchValue({ slotId: '' });
            // T6: Refresh tutor slots without reload page
            this.loadTutor();
          } else {
            this.bookingError.set(
              err.error?.error ?? 'Could not complete booking. Please try again.'
            );
          }
        }
    });
  }
}
