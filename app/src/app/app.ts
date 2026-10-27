import { Component, effect, inject, signal, viewChild } from '@angular/core';
import { GlobeComponent } from './components/globe/globe';
import { CityItem, EvaluationResult, SpatialService } from './services/spatial';
import { GameService } from './services/game';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [GlobeComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private spatialService = inject(SpatialService);
  protected gameService = inject(GameService);
  private globe = viewChild(GlobeComponent);

  protected readonly title = signal('app');

  lastPin = signal<{ lng: number; lat: number } | null>(null);

  targetCity = this.gameService.targetCity;
  targetCountry = this.gameService.targetCountry;
  evaluation = this.gameService.currentEvaluation;

  constructor() { }

  onPinDropped(coords: { lng: number; lat: number }): void {
    if (this.gameService.roundState() == 'evaluated') {
      return;
    }

    this.lastPin.set(coords);

    const result = this.gameService.submitGuess(coords);
    console.log('Guess Result: ', result);

    if (result.feedbackData.type === 'city') {
      const cityCoordinates = result.feedbackData.coords;
      this.globe()?.showCityFeedback(coords, cityCoordinates);
    } else if (result.feedbackData.feature) {
      this.globe()?.showCountryFeedback(coords, result.feedbackData.feature);
    }
  }

  onNextRound(): void {
    this.globe()?.clearFeedback();
    this.lastPin.set(null);
    this.gameService.currentRound.update(r => r + 1);
    this.gameService.nextRound();
  }
}
