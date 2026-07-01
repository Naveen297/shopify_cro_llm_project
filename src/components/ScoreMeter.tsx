interface ScoreMeterProps {
  label: string;
  value: number;
  tone: "rose" | "teal" | "amber";
}

const TONE_STYLES: Record<ScoreMeterProps["tone"], { text: string; bg: string; border: string; fill: string }> = {
  rose: { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", fill: "bg-rose-500" },
  teal: { text: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200", fill: "bg-teal-500" },
  amber: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", fill: "bg-amber-500" }
};

export function ScoreMeter({ label, value, tone }: ScoreMeterProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} px-3 py-2`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] font-bold uppercase tracking-wide ${styles.text}`}>{label}</span>
        <span className={`text-sm font-bold ${styles.text}`}>{value}</span>
      </div>
      <div className="mt-1.5 flex gap-1" role="img" aria-label={`${label}: ${value} out of 5`}>
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full transition-colors ${index < value ? styles.fill : "bg-zinc-200"}`}
          />
        ))}
      </div>
    </div>
  );
}
