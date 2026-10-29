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
  isInside: boolean; // Inside country borders or within 10 miles of a city.
  distanceKm: number;
  distanceMiles: number;
  score: number; // 0 to 100
  isInRightCountry?: boolean; // For city guessing, is guess inside right country.
  guessedCountry?: string; // For city guessing, which country was guessed.
}

export interface CameraFraming {
  center: [lng: number, lat: number];
  zoom: number;
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
   * Determine which country polygon (if any) contains the given coordinates.
   */
  getCountryAtPoint(lng: number, lat: number): GeoJSON.Feature | undefined {
    const data = this.countries();
    if (!data) return undefined;

    const pt = turf.point([lng, lat]);
    return data.features.find((f) => turf.booleanPointInPolygon(pt, f as any));
  }

  /**
   * Look up a city by name (and optionally country)
   */
  getCity(cityName: string, countryName?: string): CityItem | undefined {
    const queryCity = cityName.toLowerCase().trim();
    const queryCountry = countryName?.toLowerCase().trim();

    return this.cities().find((c) => {
      const matchesCity = c.name.toLowerCase() === queryCity;
      if (!queryCountry) return matchesCity;
      return matchesCity && c.country.toLowerCase() === queryCountry;
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

  /**
 * Evaluates a guess against a target city:
 * - 100 points if within 10 miles (16.1 km) of target coordinates
 * - Quadratic SRS decay over 2,500 km
 * - Identifies if the guess landed in the correct country
 */
  evaluateCityGuess(guessLng: number, guessLat: number, target: CityItem): EvaluationResult {
    const guessPt = turf.point([guessLng, guessLat]);
    const targetPt = turf.point([target.lng, target.lat]);

    // Great-circle distance between guess and target city
    const distanceKm = turf.distance(guessPt, targetPt, { units: 'kilometers' });
    const distanceMiles = distanceKm * 0.621371;

    // Check which country the user clicked in
    const guessCountryFeature = this.getCountryAtPoint(guessLng, guessLat);
    const guessCountryName = guessCountryFeature?.properties?.['name'];
    const isSameCountry = !!(
      guessCountryName &&
      guessCountryName.toLowerCase() === target.country.toLowerCase()
    );

    // 10 miles (16.09 km) threshold for a direct hit
    if (distanceMiles <= 10) {
      return {
        isInside: true,
        distanceKm: Math.round(distanceKm),
        distanceMiles: Math.round(distanceMiles),
        score: 100,
        isInRightCountry: isSameCountry,
        guessedCountry: guessCountryName
      };
    }

    // Quadratic decay starting outside the 10-mile radius, zeroing out at 2,500 km
    const effectiveDistanceKm = Math.max(0, distanceKm - 16.0934);
    const MAX_CITY_FAIL_KM = 2500;
    let score = 0;
    if (effectiveDistanceKm < MAX_CITY_FAIL_KM) {
      score = Math.round(100 * Math.pow(1 - (effectiveDistanceKm / MAX_CITY_FAIL_KM), 2));
    }

    return {
      isInside: false,
      distanceKm: Math.round(distanceKm),
      distanceMiles: Math.round(distanceMiles),
      score: score,
      isInRightCountry: isSameCountry,
      guessedCountry: guessCountryName
    };
  }

  getCountryCenter(countryFeature: GeoJSON.Feature): { lng: number, lat: number } {
    const center = turf.pointOnFeature(countryFeature as any);
    return {
      lng: center.geometry.coordinates[0],
      lat: center.geometry.coordinates[1]
    };
  }

  calculateCameraFraming(
    guessCoords: { lng: number; lat: number },
    targetCoords: { lng: number; lat: number }
  ): CameraFraming {
    const guessPt = turf.point([guessCoords.lng, guessCoords.lat]);
    const targetPt = turf.point([targetCoords.lng, targetCoords.lat]);
    const distanceKm = turf.distance(guessPt, targetPt, { units: 'kilometers' });
    const mid = turf.midpoint(guessPt, targetPt);
    const [midLng, midLat] = mid.geometry.coordinates;
    let zoom = 1.5;
    if (distanceKm < 50) zoom = 6;
    else if (distanceKm < 200) zoom = 5;
    else if (distanceKm < 800) zoom = 4;
    else if (distanceKm < 2500) zoom = 3;
    else if (distanceKm < 6000) zoom = 2.2;
    else zoom = 1.5;
    return {
      center: [midLng, midLat],
      zoom
    };
  }
}
