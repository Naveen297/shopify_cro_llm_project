import type { Surface } from "../shared/schemas";

export function formatSurface(surface: Surface | "all"): string {
  if (surface === "pdp") {
    return "PDP";
  }

  return surface
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toneForReadiness(value: number): "rose" | "amber" | "teal" {
  if (value < 40) {
    return "rose";
  }

  if (value < 70) {
    return "amber";
  }

  return "teal";
}
