import { AlertTriangle } from "lucide-react";

interface ErrorPanelProps {
  code: string;
  message: string;
}

export function ErrorPanel({ code, message }: ErrorPanelProps) {
  const isNonShopify = code === "NON_SHOPIFY";

  return (
    <section className="animate-fade-in flex items-start gap-4 rounded-2xl border border-rose-200 bg-rose-50 p-6">
      <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-rose-100">
        <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden="true" />
      </div>
      <div>
        <h2 className="font-semibold text-rose-950">
          {isNonShopify ? "Shopify storefront not detected" : "Audit failed"}
        </h2>
        <p className="mt-1 text-sm leading-6 text-rose-900">{message}</p>
      </div>
    </section>
  );
}
