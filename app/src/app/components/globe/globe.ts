import {
  Component,
  ElementRef,
  viewChild,
  afterNextRender,
  OnDestroy
} from '@angular/core';
import * as maplibreGl from 'maplibre-gl';

@Component({
  selector: 'app-globe',
  standalone: true,
  templateUrl: './globe.html',
  styleUrl: './globe.scss',
})
export class GlobeComponent implements OnDestroy {
  globeContainer = viewChild.required<ElementRef<HTMLDivElement>>('globeContainer');
  private map: maplibreGl.Map | null = null;

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

  private onResize = (): void => {
    this.map?.resize();
  };

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.map?.remove();
  }
}
