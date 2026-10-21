import { afterNextRender, Component, ElementRef, OnDestroy, viewChild } from '@angular/core';

import Globe, { GlobeInstance } from 'globe.gl'


@Component({
  selector: 'app-globe',
  standalone: true,
  templateUrl: './globe.html',
  styleUrl: './globe.scss',
})
export class GlobeComponent implements OnDestroy {
  globeContainer = viewChild.required<ElementRef<HTMLDivElement>>('globeContainer');
  private globeInstance: GlobeInstance | null = null;
  private resizeObserver: ResizeObserver | null = null;


  constructor() {
    afterNextRender(() => {
      this.initGlobe();
      this.setupResizeHandler();
    });
  }
  private initGlobe() {
    const container = this.globeContainer().nativeElement;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.globeInstance = new Globe(container)
      .width(width)
      .height(height)
      // High-res physical/satellite imagery without borders or labels
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
      .bumpImageUrl('https://unpkg.com/three-globe/example/img/earth-topology.png')
      .backgroundImageUrl('https://unpkg.com/three-globe/example/img/night-sky.png')
      // MapTap-style cyan atmospheric glow
      .showAtmosphere(true)
      .atmosphereColor('#44f8fb')
      .atmosphereAltitude(0.18);

    // Initial camera viewpoint centered over Europe/Africa
    this.globeInstance.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 0);

    // Tune OrbitControls for smooth inertia
    const controls = this.globeInstance.controls();
    if (controls) {
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.rotateSpeed = 0.8;
      controls.zoomSpeed = 0.8;
    }

  }

  private setupResizeHandler(): void {
    const container = this.globeContainer().nativeElement;
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && this.globeInstance) {
          this.globeInstance.width(width).height(height);
        }
      }
    });
    this.resizeObserver.observe(container);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    if (this.globeInstance) {
      this.globeInstance._destructor();
    }
  }

}
