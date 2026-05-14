"use client";

import { useState } from "react";

interface AsyncButtonProps {
  endpoint: string;
  method?: "POST" | "DELETE";
  body?: Record<string, unknown>;
  label: string;
  labelLoading?: string;
  confirmMessage?: string;
  variant?: "primary" | "danger" | "secondary";
  onSuccess?: (data: any) => void;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<NonNullable<AsyncButtonProps["variant"]>, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  danger: "bg-red-600 hover:bg-red-700 text-white",
  secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200",
};

export function AsyncButton({
  endpoint,
  method = "POST",
  body,
  label,
  labelLoading = "Procesando...",
  confirmMessage,
  variant = "primary",
  onSuccess,
  fullWidth = false,
}: AsyncButtonProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<
    | { type: "ok"; message: string }
    | { type: "error"; message: string }
    | null
  >(null);

  async function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({
          type: "error",
          message: data.error ?? `HTTP ${res.status}`,
        });
        return;
      }
      setResult({ type: "ok", message: "Listo." });
      onSuccess?.(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResult({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={fullWidth ? "w-full" : "inline-block"}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`px-4 py-2 rounded text-sm font-medium transition disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${fullWidth ? "w-full" : ""}`}
      >
        {loading ? labelLoading : label}
      </button>
      {result && (
        <p
          className={`text-xs mt-1 ${result.type === "ok" ? "text-emerald-600" : "text-red-600"}`}
        >
          {result.type === "ok" ? "✓" : "✗"} {result.message}
        </p>
      )}
    </div>
  );
}
