# GreenWave Router

Signal-aware routing that **predicts red-light delays** using traffic signal timing data (cycle length, green window, offsets) and overlays expected stops on a map.

## High-Level Concept

GreenWave Router computes a standard driving route, then adjusts the ETA by estimating waits at signalized intersections along the path. The goal is to surface a “greener” (less stop-and-go) experience by highlighting where red-light waits are likely.

## Tech Stack

- **Frontend**: Next.js (App Router), React, TypeScript
- **Map UI**: Leaflet + React-Leaflet, OpenStreetMap tiles
- **Backend**: Next.js API Routes (serverless handlers)
- **Database**: Supabase (Postgres)
- **Routing**: OSRM public demo API
- **Geocoding**: Nominatim (OpenStreetMap) with Supabase cache
- **Data pipeline**: Python seed script for bulk loading intersections + phases

## Key Features

- **Signal-Cycle Delay Model**
  - Estimates wait time using: cycle length, green duration, and offset (phase position at arrival time).
- **Geocode Caching**
  - Uses a Supabase-backed cache to avoid repeated external geocoding requests.
- **Data Pipeline**
  - Includes a Python script to bulk-load intersection locations and signal phase timing data into Supabase.

## How It Works

1) **UI → Geocode**
- User enters start/end locations in the UI.
- The app calls `GET /api/geocode?q=...` (twice: start + end).
- The API checks Supabase `geocode_cache` first; on a miss, it calls Nominatim and stores the result in Supabase.

2) **UI → Route**
- The app calls `GET /api/route?start=lng,lat&end=lng,lat`.
- The API fetches base route geometry + steps from OSRM.
- It loads intersections + signal phases from Supabase and applies a simplified “greenwave” delay model along the route geometry.

3) **UI Rendering**
- The map overlays the route polyline and marks predicted stop locations with estimated wait reasons.
- A sidebar shows estimated duration and turn-by-turn steps.

## Setup

### 1) Install dependencies

```bash
cd greenwave-app
npm install
```

### 2) Configure environment variables

Copy the template and create your local env file:

```bash
cp ../.env.example .env.local
```

Required variables for the Next.js app:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3) Create Supabase tables

The code expects these tables:

- `geocode_cache`
  - `query_string` (text, ideally unique / indexed)
  - `lat` (float8)
  - `lng` (float8)

- `intersections`
  - `id` (text or bigint)
  - `lat` (float8)
  - `lng` (float8)
  - `signal_type` (text)

- `signal_phases`
  - `intersection_id` (FK → `intersections.id`)
  - `direction` (text, e.g. `NS`, `EW`)
  - `cycle_length_sec` (int)
  - `green_duration_sec` (int)
  - `offset_sec` (int)

Also configure the relationship so `intersections` can select nested `signal_phases(*)` in Supabase.

### 4) Seed Supabase data (optional but recommended)

The repo includes `final_seed_data.json` and a bulk uploader script.

1) Export your Supabase credentials (recommended: service role key for seeding):

```bash
export SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
```

2) Install Python dependency and run:

```bash
python3 -m pip install supabase
python3 upload_to_supabase.py
```

### 5) Run the app

```bash
cd greenwave-app
npm run dev
```

Open `http://localhost:3000`.

## Notes / Limitations (current MVP behavior)

- The routing endpoint fetches all intersections and filters in code (fine for small datasets; optimize with PostGIS for scale).
- Arrival time estimation along the polyline is simplified; improve by using OSRM step durations.
- Pedestrian delay is currently modeled with a small probabilistic heuristic.

