import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

// (A2 T8) GET /tutors/search
export interface TutorSummary {
  userId: string;
  fullName: string;
  bio: string;
  hourlyRate: number;
  subjects: string[];
  averageRating: number | null;
  reviewCount: number;
}

// (A2 T5) AvailabilitySlot documents
export interface TutorSlot {
  _id: string;
  tutorId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  isBooked: boolean;
}

// (A2 T11) Reviews for tutor 
export interface TutorReview {
  rating: number;
  comment: string;
  createdDate: string;
}

// (A2 T5 T11) GET /tutors/:userId
export interface TutorDetail {
  fullName: string;
  bio: string;
  hourlyRate: number;
  subjects: string[];
  averageRating: number | null;
  reviewCount: number;
  availableSlots: TutorSlot[];
  reviews: TutorReview[];
}

// (A2 T8) GET /tutors/search req.query string
// T4: Every filters optional
export interface TutorFilters {
  subject?: string;
  minPrice?: number | null;
  maxPrice?: number | null;
  minRating?: number | null;
  availableThisWeek?: boolean;
}

// T5: Data sent to POST,PUT /tutors/profile (A2 T5)
export interface TutorProfilePayload {
  bio: string; 
  hourlyRate: number, 
  subjects: string[];   // subject ID
}

@Injectable({ providedIn: 'root' })
export class TutorService {
  private http = inject(HttpClient);

  // T4: Store tutor search results 
  private tutorsSignal = signal<TutorSummary[]>([]);
  readonly tutors = this.tutorsSignal.asReadonly();

  // T4: Fetch tutors with selected filters 
  loadTutors(filters: TutorFilters = {}): void {
    let params = new HttpParams();
    // T4: If user leaves empty field, add nothing to query string
    if (filters.subject) params = params.set('subject', filters.subject);
    if (filters.minPrice != null) params = params.set('minPrice', filters.minPrice);
    if (filters.maxPrice != null) params = params.set('maxPrice', filters.maxPrice);
    if (filters.minRating != null) params = params.set('minRating', filters.minRating);
    if (filters.availableThisWeek === true) params = params.set('availableThisWeek', 'true');

    this.http
        .get<TutorSummary[]>(`${environment.apiBaseUrl}/tutors/search`, { params })
        .subscribe(tutors => this.tutorsSignal.set(tutors));
  }

  // T4: Fetch selected tutor details
  getTutor(userId: string) {
    return this.http.get<TutorDetail>(`${environment.apiBaseUrl}/tutors/${userId}`);
  }

  // T5: Create tutor profile for the first time (A2 T5) 
  createProfile(profile: TutorProfilePayload) {
    return this.http.post(`${environment.apiBaseUrl}/tutors/profile`, profile);
  }

  // T5: Update existing tutor profile (A2 T5)
  updateProfile(profile: TutorProfilePayload) {
    return this.http.put(`${environment.apiBaseUrl}/tutors/profile`, profile);
  }
}
