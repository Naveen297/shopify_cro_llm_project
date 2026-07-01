import { toneForReadiness } from "../lib/format";

const TONE_COLORS: Record<string, string> = {
  rose: "#e11d48",
  amber: "#d97706",
  teal: "#0d9488"
};

export function ReadinessGauge({ value }: { value: number }) {
  const tone = toneForReadiness(value);
  const color = TONE_COLORS[tone];
  const angle = Math.max(0, Math.min(100, value)) * 3.6;

  return (
    <div className="relative flex h-24 w-24 flex-none items-center justify-center">
      <div
        className="absolute inset-0 rounded-full transition-[background] duration-700 ease-out"
        style={{ background: `conic-gradient(${color} ${angle}deg, #e4e4e7 ${angle}deg)` }}
        aria-hidden="true"
      />
      <div className="absolute inset-[7px] rounded-full bg-white shadow-inner" aria-hidden="true" />
      <div className="relative flex flex-col items-center">
        <span className="text-2xl font-bold leading-none text-zinc-950">{value}</span>
        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">/ 100</span>
      </div>
    </div>
  );
}
