import { Injectable, signal } from '@angular/core';
import * as turf from '@turf/turf';

export interface CountryProperties {
  name: string;
  iso2: string;
  continent: string;
}

export interface CityItem {
  name: string;
  country: string;
  countryCode: string;
  state?: string;
  isCapital: boolean;
  population: number;
  lat: number;
  lng: number;
  importanceRank: number;
}

export interface EvaluationResult {
  isInside: boolean;
  distanceKm: number;
  distanceMiles: number;
  score: number; // 0 to 100
}

@Injectable({
  providedIn: 'root'
})
export class SpatialService {
  countries = signal<GeoJSON.FeatureCollection | null>(null);
  cities = signal<CityItem[]>([]);
  isLoaded = signal(false);

  constructor() {
    this.loadDatasets();
  }

  async loadDatasets(): Promise<void> {
    try {
      const [countriesRes, citiesRes] = await Promise.all([
        fetch('/data/countries.geojson'),
        fetch('/data/cities.json')
      ]);

      const countriesData: GeoJSON.FeatureCollection = await countriesRes.json();
      const citiesData: CityItem[] = await citiesRes.json();

      this.countries.set(countriesData);
      this.cities.set(citiesData);
      this.isLoaded.set(true);
      console.log(`Loaded ${countriesData.features.length} countries & ${citiesData.length} cities.`);
    } catch (err) {
      console.error('Failed to load geo datasets:', err);
    }
  }

  /**
   * Find country GeoJSON feature by name (case-insensitive)
   */
  getCountryFeature(countryName: string): GeoJSON.Feature | undefined {
    const data = this.countries();
    if (!data) return undefined;

    const query = countryName.toLowerCase().trim();
    return data.features.find((f) => {
      const name = (f.properties?.['name'] || '').toLowerCase();
      return name === query;
    });
  }

  /**
   * Evaluates a guess against a target country:
   * - 100 points if inside polygon borders
   * - Exponential decay based on distance (km) to nearest border if outside
   */
  evaluateCountryGuess(guessLng: number, guessLat: number, targetCountryName: string): EvaluationResult {
    const pt = turf.point([guessLng, guessLat]);
    const country = this.getCountryFeature(targetCountryName);

    if (!country) {
      console.warn(`Target country "${targetCountryName}" not found in dataset.`);
      return { isInside: false, distanceKm: 0, distanceMiles: 0, score: 0 };
    }

    // 1. Check if point is inside the country polygon
    const isInside = turf.booleanPointInPolygon(pt, country as any);
    if (isInside) {
      return { isInside: true, distanceKm: 0, distanceMiles: 0, score: 100 };
    }

    // 2. Point is outside: calculate distance to closest border point
    let distanceKm = 0;
    try {
      const lines = turf.polygonToLine(country as any);

      // Some countries have multi-line boundaries (e.g. USA has Alaska, Hawaii, etc.)
      if (lines.type === 'FeatureCollection') {
        // Find the distance to the closest border.
        let minDistance = Infinity;
        for (const feature of lines.features) {
          const d = turf.pointToLineDistance(pt, feature as any, { units: 'kilometers' });
          if (d < minDistance) {
            minDistance = d;
          }
        }
        distanceKm = minDistance;
      } else {
        distanceKm = turf.pointToLineDistance(pt, lines as any, { units: 'kilometers' });
      }

    } catch (e) {
      // Fallback: great-circle distance to polygon center
      console.warn('Using fallback distance calculation.', e);
      const center = turf.center(country as any);
      distanceKm = turf.distance(pt, center, { units: 'kilometers' });
    }

    // SRS Memory Curve: Generous nearby (90+ pts within ~250km), drops quadratically to 0 at 5,000 km
    const MAX_FAIL_KM = 5000;
    let score = 0;
    if (distanceKm < MAX_FAIL_KM) {
      score = Math.round(100 * Math.pow(1 - (distanceKm / MAX_FAIL_KM), 2));
    }

    const distanceMiles = distanceKm * 0.621371;

    return {
      isInside: false,
      distanceKm: Math.round(distanceKm),
      distanceMiles: Math.round(distanceMiles),
      score
    };
  }
}
