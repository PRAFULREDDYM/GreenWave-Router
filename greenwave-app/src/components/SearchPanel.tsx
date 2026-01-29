"use client";
import { useState } from 'react';
import type { RouteResponse } from "../types/greenwave";

interface SearchPanelProps {
  onRouteCalculated: (routeData: RouteResponse) => void; 
}

export default function SearchPanel({ onRouteCalculated }: SearchPanelProps) {
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!startQuery || !endQuery) return alert("Please enter both locations.");
    setLoading(true);

    try {
      // 1. Geocode Start & End (Keep this part)
      const startRes = await fetch(`/api/geocode?q=${startQuery}`);
      const startData = await startRes.json();
      const endRes = await fetch(`/api/geocode?q=${endQuery}`);
      const endData = await endRes.json();

      if (startData.error || endData.error) throw new Error("Location not found");

      // 2. CALL THE NEW ROUTING API
      // Note: OSRM expects "Lng,Lat" (Longitude first!)
      const routeRes = await fetch(
        `/api/route?start=${startData.lng},${startData.lat}&end=${endData.lng},${endData.lat}`
      );
      const routeData = (await routeRes.json()) as RouteResponse & { error?: string };

      if (routeData.error) throw new Error(routeData.error);

      // 3. Pass the Full Route Data up
      onRouteCalculated(routeData); // We will update the interface next

    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white p-4 rounded-lg shadow-xl w-80">
      <h2 className="text-lg font-bold mb-4 text-gray-800">GreenWave Router</h2>
      
      <div className="space-y-3">
        <input 
          type="text" 
          placeholder="Start (e.g., Capitol)" 
          className="w-full p-2 border border-gray-300 rounded text-black"
          value={startQuery}
          onChange={(e) => setStartQuery(e.target.value)}
        />
        <input 
          type="text" 
          placeholder="Destination (e.g., Airport)" 
          className="w-full p-2 border border-gray-300 rounded text-black"
          value={endQuery}
          onChange={(e) => setEndQuery(e.target.value)}
        />
        
        <button 
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:bg-gray-400 font-semibold"
        >
          {loading ? 'Calculating...' : 'Find Greenest Route'}
        </button>
      </div>
    </div>
  );
}