"use client";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type UrlState = Record<string, string | undefined>;

export function useUrlState<T extends UrlState>(defaults: T) {
  const router = useRouter();
  const sp = useSearchParams();

  // read: start values = URL || defaults
  const initial = {} as T;
  (Object.keys(defaults) as (keyof T)[]).forEach((k) => {
    const v = sp.get(String(k));
    (initial as any)[k] = (v ?? (defaults[k] as any)) as any;
  });

  // writer (debounced). używaj tak: setUrl({ q, role, sortKey, sortDir })
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function setUrl(next: Partial<T>, basePath: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      const merged = { ...initial, ...next } as T;
      (Object.keys(merged) as (keyof T)[]).forEach((k) => {
        const val = merged[k];
        if (val != null && String(val).trim() !== "") params.set(String(k), String(val));
      });
      const url = params.toString() ? `${basePath}?${params.toString()}` : basePath;
      router.replace(url);
    }, 300);
  }

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { initial, setUrl } as const;
}
