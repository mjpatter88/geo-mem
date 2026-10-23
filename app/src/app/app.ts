import { Component, inject, signal } from '@angular/core';
import { GlobeComponent } from './components/globe/globe';
import { EvaluationResult, SpatialService } from './services/spatial';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GlobeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private spatialService = inject(SpatialService);

  protected readonly title = signal('app');

  targetCountry = signal('Madagascar');
  lastPin = signal<{ lng: number; lat: number } | null>(null);
  evaluation = signal<EvaluationResult | null>(null);


  onPinDropped(coords: { lng: number; lat: number }): void {
    this.lastPin.set(coords);

    const result = this.spatialService.evaluateCountryGuess(coords.lng, coords.lat, this.targetCountry());
    this.evaluation.set(result);

    console.log('Evaluation Result: ', result);
  }
}
