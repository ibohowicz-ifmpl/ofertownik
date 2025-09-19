// src/lib/prisma-middleware.ts
import type { Prisma } from "@prisma/client";
import { extractOfferMonth } from "./offerMonth";

export function withOfferMonth(params: Prisma.MiddlewareParams) {
  if (params.model !== "Offer") return params;

  if (params.action === "create" || params.action === "update") {
    const data = (params.args?.data ?? {}) as Prisma.OfferCreateInput & Prisma.OfferUpdateInput;

    const incoming =
      // obsługa { offerNo: { set: "..." } } i { offerNo: "..." }
      (data as any).offerNo?.set ??
      (data as any).offerNo ??
      undefined;

    if (incoming !== undefined) {
      const month = extractOfferMonth(typeof incoming === "string" ? incoming : null);
      (data as any).offerMonth = month;
      params.args.data = data;
    }
  }
  return params;
}

export default function registerOfferMonthMiddleware(prisma: any) {
  // Rejestruj tylko jeśli środowisko wspiera middleware
  if (prisma && typeof prisma.$use === "function") {
    prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<any>) => {
      const patched = withOfferMonth(params);
      return next(patched);
    });
  } else {
    // Brak $use → nic nie rejestrujemy (np. w edge/runtime bez middleware)
    // Filtry i backfill nadal będą działały.
  }
}
