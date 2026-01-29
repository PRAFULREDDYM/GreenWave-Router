"use client";
import dynamic from "next/dynamic";
import type { RouteResponse } from "../types/greenwave";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="p-4 text-blue-500">Loading Traffic Data...</div>,
});

export default function MapWrapper({ route }: { route: RouteResponse | null }) {
  return <Map route={route} />;
}