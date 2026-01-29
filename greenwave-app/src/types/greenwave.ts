export type LatLng = [number, number];

export type SignalDelayReason = "Red Light" | "Pedestrians";

export interface SignalHit {
  lat: number;
  lng: number;
  wait: number; // seconds
  reason: SignalDelayReason;
}

export interface RouteInstruction {
  text: string;
  distance: number; // meters
}

export interface RouteResponse {
  geometry: LatLng[]; // [lat, lng] for Leaflet
  duration: number; // seconds
  distance: number; // meters
  signals_hit: SignalHit[];
  instructions: RouteInstruction[];
}

