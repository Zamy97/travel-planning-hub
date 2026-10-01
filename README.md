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
- Shareable Finger Lakes guide: [`/finger-lakes-trip.html`](/finger-lakes-trip.html) or the PDF at [`/finger-lakes-trip.pdf`](/finger-lakes-trip.pdf). Thursday afternoon through Friday, Buffalo by Maghrib.
- **Airbnb kit** is on the home page for every trip (bodna, flip flops, pan, condiments, plates, and the rest). Checks stay in this browser until you clear them.
