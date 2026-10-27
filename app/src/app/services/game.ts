import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { CityItem, EvaluationResult, SpatialService } from './spatial';

export type GameMode = 'countries' | 'cities';

export interface RoundRecord {
  round: number;
  mode: GameMode;
  targetName: string;
  guessCoords: { lng: number; lat: number };
  evaluation: EvaluationResult;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private spatialService = inject(SpatialService);

  readonly mode = signal<GameMode>('cities');
  readonly roundState = signal<'guessing' | 'evaluated'>('guessing');
  readonly currentRound = signal(1);

  readonly targetCity = signal<CityItem | null>(null);
  readonly targetCountry = signal<string | null>(null);
  readonly currentEvaluation = signal<EvaluationResult | null>(null);

  readonly sessionHistory = signal<RoundRecord[]>([]);

  readonly totalScore = computed(() =>
    this.sessionHistory().reduce((sum, r) => sum + r.evaluation.score, 0)
  );

  readonly averageScore = computed(() => {
    const history = this.sessionHistory();
    return history.length ? Math.round(this.totalScore() / history.length) : 0;
  });

  constructor() {
    // Automatically pick the first target once datasets are ready
    effect(() => {
      if (this.spatialService.isLoaded() && !this.targetCity() && !this.targetCountry()) {
        this.nextRound();
      }
    });
  }

  setMode(mode: GameMode): void {
    this.mode.set(mode);
    this.sessionHistory.set([]);
    this.currentRound.set(1);
    this.nextRound();
  }

  nextRound(): void {
    this.currentEvaluation.set(null);
    this.roundState.set('guessing');

    if (this.mode() === 'cities') {
      const cities = this.spatialService.cities();
      if (!cities.length) return;
      // Filter for major cities/capitals to start
      const pool = cities.filter(c => c.importanceRank <= 3 || c.isCapital);
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      this.targetCity.set(chosen);
      this.targetCountry.set(null);
    } else {
      const countries = this.spatialService.countries();
      if (!countries?.features.length) return;
      const chosenFeature = countries.features[Math.floor(Math.random() * countries.features.length)];
      this.targetCountry.set(chosenFeature.properties?.['name'] || 'Unknown');
      this.targetCity.set(null);
    }
  }

  submitGuess(coords: { lng: number; lat: number }) {
    let result: EvaluationResult;
    let feedbackData: { type: 'city'; coords: { lng: number; lat: number } } | { type: 'country'; feature?: GeoJSON.Feature };

    if (this.mode() === 'cities' && this.targetCity()) {
      const city = this.targetCity()!;
      result = this.spatialService.evaluateCityGuess(coords.lng, coords.lat, city);
      feedbackData = { type: 'city', coords: { lng: city.lng, lat: city.lat } };
    } else {
      const countryName = this.targetCountry() || '';
      result = this.spatialService.evaluateCountryGuess(coords.lng, coords.lat, countryName);
      const countryFeature = this.spatialService.getCountryFeature(countryName);
      feedbackData = { type: 'country', feature: countryFeature };
    }

    this.currentEvaluation.set(result);
    this.roundState.set('evaluated');

    this.sessionHistory.update(prev => [
      ...prev,
      {
        round: this.currentRound(),
        mode: this.mode(),
        targetName: (this.targetCity()?.name || this.targetCountry()) ?? '',
        guessCoords: coords,
        evaluation: result
      }
    ]);

    return { result, feedbackData };
  }
}
