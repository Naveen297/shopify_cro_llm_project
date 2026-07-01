import { ShieldCheck, Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5 md:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-950">
            <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-950">
            CRO Opportunity Engine
          </span>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-800 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Server-side LLM calls — keys never reach the browser
        </div>
      </div>
    </header>
  );
}
