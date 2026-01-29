"use client";

import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react"; // Removed useState/Supabase for cleanliness
import type { LatLng, RouteResponse, SignalHit } from "../types/greenwave";

// Helper to center map
function MapUpdater({ bounds }: { bounds: LatLng[] | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [50, 50] });
  }, [bounds, map]);
  return null;
}

export default function Map({ route }: { route: RouteResponse | null }) {
  return (
    <div className="relative w-full h-full">
      <MapContainer 
        center={[30.2672, -97.7431]} 
        zoom={13} 
        style={{ height: "100vh", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {route && (
          <>
            {/* 1. The Route Line (Wiggly!) */}
            <Polyline 
              positions={route.geometry} 
              pathOptions={{ color: '#16a34a', weight: 6, opacity: 0.8 }} 
            />

            {/* 2. Start & End Markers */}
            <CircleMarker center={route.geometry[0]} radius={8} pathOptions={{ color: 'green', fillColor: '#0f0', fillOpacity: 1 }} />
            <CircleMarker center={route.geometry[route.geometry.length - 1]} radius={8} pathOptions={{ color: 'red', fillColor: '#f00', fillOpacity: 1 }} />

            {/* 3. The "Red Light" Warnings */}
            {route.signals_hit.map((s: SignalHit, i: number) => (
              <CircleMarker 
                key={i} 
                center={[s.lat, s.lng]} 
                radius={6}
                pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 1 }}
              >
                <Popup>
                  <strong>Wait: {Math.round(s.wait)}s</strong><br/>
                  Reason: {s.reason}
                </Popup>
              </CircleMarker>
            ))}

            <MapUpdater bounds={route.geometry} />
          </>
        )}
      </MapContainer>

    </div>
  );
}