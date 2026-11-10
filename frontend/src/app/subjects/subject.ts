import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// T3: Subject name to count 
// T6 
export interface Subject {
  _id: string; 
  name: string;
}

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private http = inject(HttpClient);

  // T3: Get all subjects to count catalogue size
  getAll(): Observable<Subject[]> {
    return this.http.get<Subject[]>(`${environment.apiBaseUrl}/subjects`);
  }
}
