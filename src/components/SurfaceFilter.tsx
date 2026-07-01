import { Filter } from "lucide-react";
import type { Surface } from "../shared/schemas";
import { formatSurface } from "../lib/format";

interface SurfaceFilterProps {
  surfaces: Array<Surface | "all">;
  active: Surface | "all";
  onChange: (surface: Surface | "all") => void;
  countFor: (surface: Surface | "all") => number;
}

export function SurfaceFilter({ surfaces, active, onChange, countFor }: SurfaceFilterProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
        <Filter className="h-4 w-4" aria-hidden="true" />
        Filter by surface
      </div>
      <div className="flex flex-wrap gap-2">
        {surfaces.map((surface) => {
          const isActive = active === surface;

          return (
            <button
              key={surface}
              type="button"
              onClick={() => onChange(surface)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "border-zinc-950 bg-zinc-950 text-white shadow-sm"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
              }`}
            >
              {formatSurface(surface)}
              <span
                className={`rounded-full px-1.5 text-xs ${
                  isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500"
                }`}
              >
                {countFor(surface)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
