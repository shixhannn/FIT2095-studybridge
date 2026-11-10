import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// T3 T5 
export interface AvailabilitySlot {
  _id: string;
  tutorId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  isBooked: boolean;
}

// T5: Data to publish slot
export interface CreateSlotPayload{
  date: string; 
  startTime: string; 
  durationMinutes: number; 
}

@Injectable({ providedIn: 'root' })
export class SlotService {
  private http = inject(HttpClient);

  // T3/T5: Get availability slots for logged-in tutors
  getMine(): Observable<AvailabilitySlot[]> {
    return this.http.get<AvailabilitySlot[]>(
      `${environment.apiBaseUrl}/slots/mine`);
  }

  // T5: POST /slots (A2 T7)
  createSlot(slot: CreateSlotPayload) {
    return this.http.post<AvailabilitySlot>(
      `${environment.apiBaseUrl}/slots`, slot);
  }

  // T5: DELETE /slots/:slotId (A2 T7)
  deleteSlot(slotId: string) {
    return this.http.delete(
      `${environment.apiBaseUrl}/slots/${slotId}`
    );
  }
}
