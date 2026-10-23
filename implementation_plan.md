# Geo-Mem: Implementation Plan

A spaced-repetition web application to memorize the locations of countries and cities on a blank 3D globe.

---

## 1. Architectural Overview & Tech Stack Recommendations

### 1.1 Stack Selection

| Layer | Recommended Choice | Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | **Angular 21** | Familiar to you, robust enterprise structure, modern Angular (Signals, standalone components, typed forms, modern control flow `@if` / `@for`). |
| **3D Globe Provider** | **MapLibre GL JS** (with 3D Globe Projection) | **Multi-level zoom without blurriness.** Natively streams unlabelled multi-resolution satellite tiles (ESRI World Imagery) from zoom level 0 down to zoom level 18+. Built-in smooth inertial rotation/zoom, accurate pointer-to-coordinate mapping (`e.lngLat`), and native GeoJSON layer rendering for pins, arcs, and country boundary highlights. |
| **Backend & Database** | **Firebase** (Auth + Firestore + Hosting) | **No custom backend server needed.** All game logic, spatial validation, and SRS scheduling can run securely client-side in TypeScript. Cloud Firestore stores user attempt histories and SRS card states. Firebase Auth handles Google/Gmail sign-in. Firebase Hosting enables single-command deploys. |
| **Spatial Engine** | **Turf.js** (`@turf/turf`) | Industry-standard spatial analysis in JavaScript. Fast client-side point-in-polygon checks (`booleanPointInPolygon`) and geodesics/distances (`distance`, `pointToLineDistance`). Runs in microseconds in the browser. |
| **Geo Datasets** | **Natural Earth GeoJSON** | Free, public-domain vectors: 1:50m / 1:110m countries GeoJSON (~500KB compressed) and curated populated places / cities dataset (~1,000–3,000 cities with population rank, country, and coordinates). |
| **Spaced Repetition** | **SuperMemo-2 (SM-2)** adapted for Spatial Accuracy | Proven, lightweight algorithmic model. Maps guess accuracy/distance to recall quality ratings ($q \in [0, 5]$) to dynamically adjust review intervals and ease factors. |
| **Data Viz / Stats** | **Chart.js** (or Apache ECharts) | Lightweight, responsive charts for accuracy trends, mastery progression, continent heatmaps, and retention curves. |
| **Python Utilities** *(Optional)* | **Python 3.14 Data Prep Scripts** | Used only as offline developer scripts (not a production server) to fetch, clean, filter, and minify city and country GeoJSON datasets into lightweight assets for the Angular app. |

---

## 2. Core Game Mechanics & Scoring Math

### 2.1 The Long-Press Pin Drop
- **Interaction**: Tap/click and hold for **1.0 second**.
- **Visual Feedback**:
  - A circular radial SVG or canvas progress ring expands around the touch/cursor point.
  - If released before 1.0s, the timer cancels and no pin is dropped (allowing users to freely drag and rotate the globe without accidental pins).
  - Upon 1.0s completion: Haptic feedback (on mobile), ping sound/visual pulse, and the guess coordinates `(lat, lng)` are locked.

### 2.2 Scoring Formulas

#### Countries Mode
- **Inside Border**: Score = **100**.
- **Outside Border**: Calculated from distance $d$ (in km) to the nearest border point using Turf.js:
  $$\text{Score} = \begin{cases} \text{round}\left(100 \times \left(1 - \frac{d}{5000}\right)^2\right) & \text{if } d < 5000\text{ km} \\ 0 & \text{if } d \ge 5000\text{ km} \end{cases}$$
  *(Balanced SRS memory curve: generous within 1,000 km, reaches 0 on wrong continent > 5,000 km).*

#### Cities Mode
- **Within Tolerance**: $\le 10\text{ miles}$ ($\sim 16.1\text{ km}$) = **100**.
- **Outside Tolerance**:
  $$\text{Score} = \max\left(0, \text{round}\left(100 \times e^{-(d - 16.1) / 800}\right)\right)$$

### 2.3 Spaced Repetition Model (SM-2 Spatial Adapter)
Each target (Country or City) is tracked as an SRS card:
- Fields: `easeFactor` (default 2.5), `interval` (days), `repetitions`, `nextDueDate`, `history`.
- Mapping score to SM-2 quality grade $q \in [0, 5]$:
  - Score 95–100: Grade 5 (Perfect recall)
  - Score 80–94: Grade 4 (Good recall)
  - Score 60–79: Grade 3 (Pass with minor error)
  - Score 40–59: Grade 2 (Fail, close)
  - Score 20–39: Grade 1 (Wrong region)
  - Score 0–19: Grade 0 (Complete blackout)

### 2.4 Mobile & Desktop Responsiveness Architecture
To ensure seamless parity between phone screens and desktop monitors:
1. **Unified Pointer Events**: Using the modern `PointerEvent` API (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) rather than disparate `mouse*` / `touch*` events. This guarantees the 1.0s hold engine functions identically for mouse clicks, trackpads, touchscreens, and styluses.
2. **Prevent Accidental Mobile Page Refresh**: Applying `overscroll-behavior-y: contain` to `html, body`. This blocks Chrome/Safari's pull-to-refresh gesture from reloading the page while spinning or panning the globe.
3. **Gesture & Pinch-Zoom Isolation**: Applying `touch-action: pan-x pan-y` to the document and canvas so two-finger globe pinch-zooming operates smoothly without triggering browser-level document scaling.
4. **Safe Area Insets**: Using CSS `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` so HUD overlays and score drawers are never obscured by iPhone dynamic islands, notches, or Android system gesture bars.
5. **Mobile Haptics**: Triggering `navigator.vibrate?.(50)` upon successful 1.0s pin drop for physical tactile feedback on mobile devices.
6. **Adaptive HUD Layout**: Using responsive CSS units (`clamp()`, `rem`, and CSS variables) so HUD components automatically scale without clipping on compact 320px–390px mobile screens while staying elegant on widescreen desktop monitors.

### 2.5 Realistic Zoom Limit Setting (MapTap Mode)
- **Problem**: When zoomed in too far (zoom 12–18), urban streets, bridges, and building footprints become visible, making it too easy to recognize a city by its infrastructure rather than pure geographic recall.
- **Solution (Configurable Setting)**:
  - **Exploratory / Casual Mode**: `maxZoom: 16` (allows deep zoom to inspect islands, coastlines, and micro-geography).
  - **Realistic Practice Mode (MapTap Parity)**: `maxZoom: 8.5` (restricts zoom level, showing natural geographic contours, rivers, and coastlines while keeping individual streets and buildings hidden).
- **Implementation**: Dynamically toggled via `map.setMaxZoom(isRealistic ? 8.5 : 16)` and persisted in user preferences (`localStorage` and Firebase profile).

---

## 3. Data Schema (Cloud Firestore)

```
users/{userId}
  ├── profile: { displayName, email, createdAt, preferences }
  │
  ├── srs_cards/{itemId}
  │     ├── itemId: string (e.g. "US", "city_tokyo")
  │     ├── itemType: "country" | "city"
  │     ├── name: string
  │     ├── continent: string
  │     ├── countryCode?: string
  │     ├── importanceRank: number (1 = high)
  │     ├── easeFactor: number (e.g., 2.5)
  │     ├── interval: number (days)
  │     ├── repetitions: number
  │     ├── nextDueDate: Timestamp
  │     └── lastAttemptDate: Timestamp
  │
  └── attempts/{attemptId}
        ├── itemId: string
        ├── itemType: "country" | "city"
        ├── timestamp: Timestamp
        ├── targetCoords: [lng, lat]
        ├── guessCoords: [lng, lat]
        ├── distanceKm: number
        ├── score: number (0-100)
        ├── isCorrectCountry?: boolean
        └── mode: "country" | "city" | "continent" | "daily"
```

---

## 4. Step-by-Step Implementation Roadmap

As requested, we will build this together step-by-step. In each step, I will provide the context, architectural guidance, and instructions so you can write and test the code yourself.

### Phase 1: Angular Scaffolding & Design Foundation
- **Step 1.1**: Initialize Angular application with standalone components, SCSS, and routing.
- **Step 1.2**: Set up app layout (Header/Navbar, Mode Switcher, Canvas Container, Score Drawer).
- **Step 1.3**: Configure mobile-first viewport meta tags and touch gesture optimizations (preventing unwanted iOS/Android pull-to-refresh or text selection).

### Phase 2: The 3D Globe & Long-Press Interaction
- **Step 2.1**: Install MapLibre GL JS (`maplibre-gl`).
- **Step 2.2**: Configure `GlobeComponent` with MapLibre 3D Globe projection, unlabelled ESRI World Imagery raster tiles (streaming zoom 0 to 18), dark space background, and initial camera viewpoint.
- **Step 2.3**: Build the **1-second Long-Press Directive**:
  - Touch/Pointer events (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`).
  - Animated SVG radial circular progress ring following pointer.
  - Cancellation if dragged beyond small movement threshold.
  - Coordinates capture `(lat, lng)`.
- **Step 2.4**: Validation: Render dropped pins, test deep multi-level zoom into coastlines and cities, and test responsiveness on mobile and desktop.

### Phase 3: Spatial Engine & Geographic Data Pipeline
- **Step 3.1**: Curate country boundaries (GeoJSON) and city databases (Capitals + top global cities with populations & importance ranks).
- **Step 3.2**: Integrate Turf.js (`@turf/turf`).
- **Step 3.3**: Implement `SpatialService`:
  - `findCountryAtPoint(lng, lat)`
  - `distanceToCountry(lng, lat, countryFeature)`
  - `distanceToCity(lng, lat, cityTarget)`
  - Scoring functions (0–100 scale).
- **Step 3.4**: Visual feedback on globe:
  - Draw pin at user's guess.
  - Draw target pin or highlight true country boundary in green.
  - Draw connecting arc / geodesic line between guess and target showing distance error.

### Phase 4: Core Quiz Modes
- **Step 4.1**: **Countries Mode**: Random / progression-based country identification.
- **Step 4.2**: **Cities Mode**: Capital & major city identification with distance tolerance.
- **Step 4.3**: **Continent/Country Filter Mode**: Allow player to filter targets by continent (e.g., "Africa Only") or cities within a specific country (e.g., "US Cities").
- **Step 4.4**: Round Summary & Feedback Panel with immediate score, distance, and historical comparison.

### Phase 5: Firebase Authentication & Cloud Storage
- **Step 5.1**: Set up Firebase project & register web app.
- **Step 5.2**: Integrate `@angular/fire` and Firebase SDK.
- **Step 5.3**: Implement Google Sign-In (`AuthService`).
- **Step 5.4**: Implement Firestore Attempt Logger (`StatsService`): save every tap with coordinates, distance error, score, and timestamps.

### Phase 6: Spaced Repetition Engine (SRS) & Daily Practice Mode
- **Step 6.1**: Implement the SM-2 algorithm in TypeScript (`SrsEngineService`).
- **Step 6.2**: Design the Daily Practice selection algorithm:
  - Mix of due reviews (based on `nextDueDate`) + a configurable number of new items ordered by importance rank.
- **Step 6.3**: Daily Practice Quiz Session flow: queue items, process ratings, update card intervals in Firestore.

### Phase 7: Analytics, Profile & Mastery Dashboard
- **Step 7.1**: Integrate Chart.js / ng2-charts.
- **Step 7.2**: Build Progress Overview:
  - Countries mastered vs. learning vs. unseen.
  - Average distance error over time.
  - Daily review streak.
- **Step 7.3**: "Weak Points" Analysis: Identify countries/cities with lowest average scores or highest distance errors.
- **Step 7.4**: Interactive Mastery Map: Colorize the globe to show mastery level per country.

### Phase 8: Mobile Polish, PWA & Deployment
- **Step 8.1**: Add PWA support (`@angular/pwa`) for full-screen offline-capable mobile experience.
- **Step 8.2**: Performance audit (bundle size, WebGL memory cleanup on view navigation).
- **Step 8.3**: Deploy to Firebase Hosting.

---

## 5. Architectural Trade-offs & Recommendations

1. **MapLibre GL JS 3D Globe vs. Static-Texture Spheres**:
   - Single static texture globes (like Globe.gl's default) become blurry and pixelated when zooming into cities or narrow geographic features.
   - MapLibre GL JS with 3D Globe projection natively streams multi-resolution raster tiles (LOD quadtree) on demand. By connecting to ESRI World Imagery, we get complete global satellite coverage with **zero political borders and zero text labels**, completely free, with crisp zoom down to street level.
2. **Pure Client vs. Server**:
   - Everything required by this specification (spatial calculations, SRS, scoring) is lightweight enough to run 100% in the client. This keeps hosting completely free on Firebase tier, works with near-zero latency, and allows offline gameplay.
