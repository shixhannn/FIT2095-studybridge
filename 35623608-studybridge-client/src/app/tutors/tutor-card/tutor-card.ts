import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TutorSummary } from '../tutor';

@Component({
  selector: 'app-tutor-card',
  imports: [RouterLink],
  templateUrl: './tutor-card.html', 
  styleUrl: './tutor-card.css',
})
export class TutorCard {
  tutor = input.required<TutorSummary>();
}