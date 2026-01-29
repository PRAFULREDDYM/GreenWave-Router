"use client";
import dynamic from 'next/dynamic';
import { useState } from 'react';
import SearchPanel from '../components/SearchPanel';
import RouteSidebar from '../components/RouteSidebar'; // Import the new sidebar
import type { RouteResponse } from "../types/greenwave";

const MapWrapper = dynamic(() => import('../components/MapWrapper'), { 
  ssr: false,
  loading: () => <p>Loading Map...</p>
});

export default function Home() {
  const [route, setRoute] = useState<RouteResponse | null>(null);

  const handleRouteCalculated = (routeData: RouteResponse) => {
    setRoute(routeData);
  };

  return (
    <main className="relative w-full h-screen overflow-hidden">
      {/* 1. Search Panel (Top Left) */}
      <SearchPanel onRouteCalculated={handleRouteCalculated} />

      {/* 2. Route Sidebar (Top Right) - Now explicitly rendered here */}
      <RouteSidebar route={route} />

      {/* 3. Map Layer (Background) */}
      <div className="absolute inset-0 z-0">
        <MapWrapper route={route} />
      </div>
    </main>
  );
}