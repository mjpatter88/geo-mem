import {
  Component,
  ElementRef,
  viewChild,
  output,
  afterNextRender,
  OnDestroy,
  inject
} from '@angular/core';
import * as maplibreGl from 'maplibre-gl';
import * as turf from '@turf/turf';
import { MapMouseEvent, Marker } from 'maplibre-gl';
import { HoldCompleteEvent, HoldToPlaceDirective } from '../../directives/hold-to-place';
import { SpatialService } from '../../services/spatial';

@Component({
  selector: 'app-globe',
  standalone: true,
  templateUrl: './globe.html',
  styleUrl: './globe.scss',
  imports: [HoldToPlaceDirective]
})
export class GlobeComponent implements OnDestroy {
  private spatialService = inject(SpatialService);
  globeContainer = viewChild.required<ElementRef<HTMLDivElement>>('globeContainer');
  private map: maplibreGl.Map | null = null;
  private currentMarker: Marker | null = null;
  private targetMarker: Marker | null = null;

  pinDropped = output<{ lng: number; lat: number }>();

  constructor() {
    afterNextRender(() => {
      this.initGlobe();
    });
  }

  private initGlobe(): void {
    const container = this.globeContainer().nativeElement;

    maplibreGl.setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href);

    // Initialize MapLibre with native 3D Globe Projection
    this.map = new maplibreGl.Map({
      container,
      style: {
        version: 8,
        projection: {
          type: 'globe' // Enables full 3D interactive sphere
        },
        sources: {
          'esri-satellite': {
            type: 'raster',
            tiles: [
              // 100% unlabelled, borderless high-resolution satellite imagery (zoom 0 to 19)
              'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 19
          },
          // 1. Source for target country boundary
          'target-polygon': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          },
          // 2. Source for geodesic great-circle flight arc
          'guess-arc': {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          }
        },
        layers: [
          {
            id: 'esri-satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 22
          },
          // Translucent emerald green fill inside the country
          {
            id: 'target-polygon-fill',
            type: 'fill',
            source: 'target-polygon',
            paint: {
              'fill-color': '#10b981',
              'fill-opacity': 0.35
            }
          },
          // Crisp neon emerald border
          {
            id: 'target-polygon-outline',
            type: 'line',
            source: 'target-polygon',
            paint: {
              'line-color': '#34d399',
              'line-width': 2.5
            }
          },
          // Dashed amber flight path arc between guess and target
          {
            id: 'guess-arc-line',
            type: 'line',
            source: 'guess-arc',
            paint: {
              'line-color': '#fbbf24',
              'line-width': 3.5,
              'line-dasharray': [2, 2],
              'line-opacity': 0.9
            }
          }
        ]
      },
      center: [0, 20],
      zoom: 1.5,
      minZoom: 1.2,
      maxZoom: 16,
      attributionControl: false // Keeps canvas clean of watermarks
    });

    // Handle container resizing
    window.addEventListener('resize', this.onResize);
  }

  onHoldComplete(e: HoldCompleteEvent): void {
    if (!this.map) return;
    // Unproject pixel {x, y} to geographical {lng, lat}
    const lngLat = this.map.unproject([e.x, e.y]).wrap();
    console.log('Placing marker at:', lngLat);
    if (this.currentMarker) {
      this.currentMarker.setLngLat(lngLat);
    } else {
      this.currentMarker = new Marker({ color: '#ff4d4d' })
        .setLngLat(lngLat)
        .addTo(this.map);
    }

    // Emit the coordinates up to the parent.
    this.pinDropped.emit({ lng: lngLat.lng, lat: lngLat.lat });
  }

  /**
 * Highlights the target country polygon and draws an arc from the guess pin
 */
  showCountryFeedback(guessCoords: { lng: number; lat: number }, countryFeature: GeoJSON.Feature): void {
    if (!this.map) return;

    // 1. Highlight target country polygon
    const countrySource = this.map.getSource('target-polygon') as maplibreGl.GeoJSONSource;
    countrySource?.setData(countryFeature);

    // 2. Draw great-circle arc to country center if guess was outside
    const center = turf.pointOnFeature(countryFeature as any);
    const [targetLng, targetLat] = center.geometry.coordinates;

    const guessPt = turf.point([guessCoords.lng, guessCoords.lat]);
    const targetPt = turf.point([targetLng, targetLat]);

    const distance = turf.distance(guessPt, targetPt, { units: 'kilometers' });
    const arcSource = this.map.getSource('guess-arc') as maplibreGl.GeoJSONSource;
    if (distance > 20) {
      const arc = turf.greatCircle(guessPt, targetPt, { npoints: 60 });
      arcSource?.setData(arc as any);
    } else {
      arcSource?.setData({ type: 'FeatureCollection', features: [] });
    }
    const targetCoords = this.spatialService.getCountryCenter(countryFeature);
    this.flyToFraming(guessCoords, targetCoords);

  }

  /**
   * Drops a green target marker on the city and draws an arc from the guess pin
   */
  showCityFeedback(guessCoords: { lng: number; lat: number }, targetCoords: { lng: number; lat: number }): void {
    if (!this.map) return;

    // 1. Place green target marker
    if (this.targetMarker) {
      this.targetMarker.setLngLat(targetCoords);
    } else {
      this.targetMarker = new Marker({ color: '#10b981' })
        .setLngLat(targetCoords)
        .addTo(this.map);
    }

    // 2. Draw great-circle arc from user pin to city
    const guessPt = turf.point([guessCoords.lng, guessCoords.lat]);
    const targetPt = turf.point([targetCoords.lng, targetCoords.lat]);

    const distance = turf.distance(guessPt, targetPt, { units: 'kilometers' });
    const arcSource = this.map.getSource('guess-arc') as maplibreGl.GeoJSONSource;
    if (distance > 10) {
      const arc = turf.greatCircle(guessPt, targetPt, { npoints: 60 });
      console.log('Drawing arc:', { distance, arcSource: !!arcSource, arc });
      arcSource?.setData({
        type: 'FeatureCollection',
        features: [arc]
      });
    } else {
      arcSource?.setData({ type: 'FeatureCollection', features: [] });
    }

    this.flyToFraming(guessCoords, targetCoords);
  }

  /**
   * Clears all feedback layers and markers for the next round
   */
  clearFeedback(): void {
    if (!this.map) return;

    const countrySource = this.map.getSource('target-polygon') as maplibreGl.GeoJSONSource;
    countrySource?.setData({ type: 'FeatureCollection', features: [] });

    const arcSource = this.map.getSource('guess-arc') as maplibreGl.GeoJSONSource;
    arcSource?.setData({ type: 'FeatureCollection', features: [] });

    if (this.currentMarker) {
      this.currentMarker.remove();
      this.currentMarker = null;
    }
    if (this.targetMarker) {
      this.targetMarker.remove();
      this.targetMarker = null;
    }
    if (this.map && this.map.getZoom() > 2.5) {
      this.map.easeTo({ zoom: 2.8, duration: 800 });
    }
  }

  private flyToFraming(guessCoords: { lng: number; lat: number }, targetCoords: { lng: number; lat: number }): void {
    if (!this.map) return;
    const { center, zoom } = this.spatialService.calculateCameraFraming(guessCoords, targetCoords);

    this.map.flyTo({
      center,
      zoom,
      duration: 1200,
      essential: true
    });
  }


  private onResize = (): void => {
    this.map?.resize();
  };

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.map?.remove();
  }
}
