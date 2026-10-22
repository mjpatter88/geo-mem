import {
  Component,
  ElementRef,
  viewChild,
  output,
  afterNextRender,
  OnDestroy
} from '@angular/core';
import * as maplibreGl from 'maplibre-gl';
import { MapMouseEvent, Marker } from 'maplibre-gl';
import { HoldCompleteEvent, HoldToPlaceDirective } from '../../directives/hold-to-place';

@Component({
  selector: 'app-globe',
  standalone: true,
  templateUrl: './globe.html',
  styleUrl: './globe.scss',
  imports: [HoldToPlaceDirective]
})
export class GlobeComponent implements OnDestroy {
  globeContainer = viewChild.required<ElementRef<HTMLDivElement>>('globeContainer');
  private map: maplibreGl.Map | null = null;
  private currentMarker: Marker | null = null;

  pinDropped = output<{ lng: number; lat: number }>();

  constructor() {
    afterNextRender(() => {
      this.initGlobe();
    });
  }

  private initGlobe(): void {
    const container = this.globeContainer().nativeElement;

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
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
            ],
            tileSize: 256,
            maxzoom: 19
          }
        },
        layers: [
          {
            id: 'esri-satellite-layer',
            type: 'raster',
            source: 'esri-satellite',
            minzoom: 0,
            maxzoom: 22
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
    const lngLat = this.map.unproject([e.x, e.y]);
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


  private onResize = (): void => {
    this.map?.resize();
  };

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.map?.remove();
  }
}
