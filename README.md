# Waymark — Travel Planning Hub

Angular 19 app for saving places, sketching road trips, and tracking visited spots. Data lives in **browser localStorage** (export/import JSON for backups).

## Run locally

```bash
npm install
npm start
```

Open [http://localhost:4200/](http://localhost:4200/).

## Build

```bash
npm run build:prod
```

Output: `dist/travel-planning-hub/browser`.

## Deploy to Vercel

1. Push this repo to GitHub (or connect the folder in the Vercel dashboard).
2. Import the project in [Vercel](https://vercel.com).
3. Leave defaults — `vercel.json` sets:
   - **Build command:** `npm run build:prod`
   - **Output directory:** `dist/travel-planning-hub/browser`
4. Deploy.

CLI alternative from this folder:

```bash
npx vercel
```

## Notes

- No backend: places persist only in the current browser via localStorage.
- Use **Export** / **Import** to move data between devices or browsers.
- Maps use **Leaflet + OpenStreetMap** (interactive). Road trips draw a driving route via OSRM when available, with numbered stops and an “Open in Google Maps” link.
- New custom places are geocoded with OpenStreetMap Nominatim from the map search / title.
