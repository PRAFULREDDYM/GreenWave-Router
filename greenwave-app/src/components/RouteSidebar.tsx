"use client";

interface RouteSidebarProps {
  route: import("../types/greenwave").RouteResponse | null;
}

export default function RouteSidebar({ route }: RouteSidebarProps) {
  if (!route) return null; // Don't show if no route exists

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white p-4 rounded-lg shadow-xl w-80 max-h-[80vh] overflow-y-auto text-black border border-gray-200">
      <h3 className="font-bold text-lg mb-2 text-gray-800">Route Details</h3>
      
      {/* Summary Box */}
      <div className="mb-4 p-3 bg-green-50 rounded border border-green-100">
        <p className="text-sm font-bold text-green-800">
          ⏱️ Est. Time: {Math.round(route.duration / 60)} min
        </p>
        <p className="text-xs text-green-700 mt-1">
          🚦 Stops predicted: {route.signals_hit.length}
        </p>
      </div>

      {/* Turn-by-Turn List */}
      <div className="space-y-3">
        {route.instructions.map((step, i: number) => (
          <div key={i} className="flex items-start text-sm border-b border-gray-100 pb-2 last:border-0">
            <span className="mr-2 mt-0.5 text-gray-400">↳</span>
            <div>
              <p className="text-gray-700 font-medium">{step.text}</p>
              <p className="text-xs text-gray-400">{Math.round(step.distance)} meters</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}