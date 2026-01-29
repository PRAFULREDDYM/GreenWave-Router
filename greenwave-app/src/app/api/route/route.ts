import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// --- THE "ML" LOGIC HELPERS ---

// 1. Calculate Pedestrian Buffer (Probabilistic)
function getPedestrianDelay(hour: number) {
  // Higher chance of pedestrians during lunch (12-1) and evening (5-7)
  const isBusyTime = (hour >= 12 && hour <= 13) || (hour >= 17 && hour <= 19);
  if (isBusyTime) {
    // 30% chance of a 15-second delay for pedestrians
    return Math.random() < 0.3 ? 15 : 0;
  }
  return 0;
}

// 2. The Traffic Light Prediction Model
function calculateSignalDelay(
  signal: { offset_sec?: number; cycle_length_sec?: number; green_duration_sec?: number },
  arrivalTime: Date
) {
  const secondsSinceMidnight = 
    arrivalTime.getHours() * 3600 + 
    arrivalTime.getMinutes() * 60 + 
    arrivalTime.getSeconds();

  // "ML" Logic: Check cycle phase
  const cyclePosition = (secondsSinceMidnight - (signal.offset_sec || 0)) % (signal.cycle_length_sec || 90);
  const greenDuration = signal.green_duration_sec || 45;

  // If cyclePosition > greenDuration, the light is RED
  if (cyclePosition > greenDuration) {
    // Return remaining wait time
    return (signal.cycle_length_sec || 90) - cyclePosition;
  }
  return 0; // Light is GREEN!
}

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing Supabase env vars' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start'); // Format: "lng,lat"
  const end = searchParams.get('end');     // Format: "lng,lat"

  if (!start || !end) return NextResponse.json({ error: 'Missing coords' }, { status: 400 });

  try {
    // --- STEP 1: GET THE ROAD GEOMETRY (OSRM) ---
    // We use OSRM's public demo API (Free)
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson&steps=true`;
    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();

    if (osrmData.code !== 'Ok') throw new Error('Route not found');

    const route = osrmData.routes[0];
    let totalDuration = route.duration; // In seconds
    const geometry = route.geometry.coordinates; // [[lng, lat], [lng, lat]...]

    // --- STEP 2: FETCH SIGNALS FROM DB ---
    // Optimization: In a real app, use PostGIS 'ST_DWithin'. 
    // For MVP, we fetch all and filter in JS (since we only have ~1000 nodes).
    const { data: signals } = await supabase.from('intersections').select('*, signal_phases(*)');

    // --- STEP 3: APPLY "GREENWAVE" LOGIC ---
    const signalsOnRoute: { lat: number; lng: number; wait: number; reason: "Red Light" | "Pedestrians" }[] = [];
    const currentTime = new Date(); // Assume user leaves NOW
    let timeElapsed = 0;

    // Check every point on the road to see if it matches a signal
    // Note: This is a simplified "Point Matching" loop
    for (let i = 0; i < geometry.length; i++) {
      const [rLng, rLat] = geometry[i];
      
      // Simple Distance Check (Roughly 20 meters)
      const nearbySignal = signals?.find((s: { lat: number; lng: number; signal_phases?: unknown[] }) => 
        Math.abs(s.lat - rLat) < 0.0002 && Math.abs(s.lng - rLng) < 0.0002
      );

      if (nearbySignal) {
        // Estimate arrival at this specific intersection
        // (Rough estimate: assume constant speed for this segment)
        const estimatedArrival = new Date(currentTime.getTime() + timeElapsed * 1000);
        
        // 1. Calculate Signal Delay
        // We use the first phase direction for MVP
        const phaseInfo = (nearbySignal.signal_phases?.[0] as {
          offset_sec?: number;
          cycle_length_sec?: number;
          green_duration_sec?: number;
        }) || {};
        const signalWait = calculateSignalDelay({ ...nearbySignal, ...phaseInfo }, estimatedArrival);
        
        // 2. Calculate Pedestrian Buffer
        const pedWait = getPedestrianDelay(estimatedArrival.getHours());

        const totalNodeDelay = signalWait + pedWait;

        if (totalNodeDelay > 0) {
          totalDuration += totalNodeDelay;
          signalsOnRoute.push({
            lat: nearbySignal.lat,
            lng: nearbySignal.lng,
            wait: totalNodeDelay,
            reason: signalWait > 0 ? "Red Light" : "Pedestrians"
          });
        }
      }
      
      // Increment time (assuming ~1 second per geometry point for simplicity in this loop)
      timeElapsed += 1; 
    }

    return NextResponse.json({
      geometry: geometry.map((p: number[]) => [p[1], p[0]]), // Flip to [Lat, Lng] for Leaflet
      duration: Math.round(totalDuration), // Adjusted duration
      distance: route.distance,
      signals_hit: signalsOnRoute,
      instructions: route.legs[0].steps.map(
        (s: { maneuver: { type: string; modifier?: string }; name: string; distance: number }) => ({
        text: s.maneuver.type + ' ' + s.maneuver.modifier + ' on ' + s.name,
        distance: s.distance
      })
      ) // Turn-by-turn instructions
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Routing failed' }, { status: 500 });
  }
}