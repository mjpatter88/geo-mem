import { Component, effect, inject, signal } from '@angular/core';
import { GlobeComponent } from './components/globe/globe';
import { CityItem, EvaluationResult, SpatialService } from './services/spatial';

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
  targetCity = signal<CityItem | null>(null);

  lastPin = signal<{ lng: number; lat: number } | null>(null);
  evaluation = signal<EvaluationResult | null>(null);

  constructor() {
    // Once spatial data loads, pick Tokyo for temporary testing
    effect(() => {
      if (this.spatialService.isLoaded()) {
        const tokyo = this.spatialService.getCity('Tokyo', 'Japan');
        if (tokyo) this.targetCity.set(tokyo);
      }
    });
  }

  onPinDropped(coords: { lng: number; lat: number }): void {
    this.lastPin.set(coords);

    let result: EvaluationResult;
    if (this.targetCity()) {
      result = this.spatialService.evaluateCityGuess(coords.lng, coords.lat, this.targetCity()!);
    } else {
      result = this.spatialService.evaluateCountryGuess(coords.lng, coords.lat, this.targetCountry());
    }

    this.evaluation.set(result);

    console.log('Evaluation Result: ', result);
  }
}
