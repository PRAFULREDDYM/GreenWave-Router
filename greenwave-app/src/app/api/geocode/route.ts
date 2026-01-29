import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(request: Request) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Server misconfigured: missing Supabase env vars' },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) return NextResponse.json({ error: 'Missing query' }, { status: 400 });

  // 1. Check Cache (Supabase)
  const { data: cached } = await supabase
    .from('geocode_cache')
    .select('*')
    .eq('query_string', query.toLowerCase())
    .single();

  if (cached) {
    console.log(`Cache Hit for: ${query}`);
    return NextResponse.json(cached);
  }

  // 2. Cache Miss? Ask Nominatim (OpenStreetMap)
  console.log(`Fetching from Nominatim: ${query}`);
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Austin, TX')}`;
  
  try {
    const res = await fetch(nominatimUrl, {
      headers: { 'User-Agent': 'GreenWaveApp/1.0' } // Required by OSM
    });
    const results = await res.json();

    if (!results || results.length === 0) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const firstResult = results[0];
    const lat = parseFloat(firstResult.lat);
    const lng = parseFloat(firstResult.lon);

    // 3. Save to Cache (Supabase) so we never ask Nominatim again
    await supabase.from('geocode_cache').insert({
      query_string: query.toLowerCase(),
      lat,
      lng
    });

    return NextResponse.json({ lat, lng });

  } catch {
    return NextResponse.json({ error: 'Geocoding failed' }, { status: 500 });
  }
}