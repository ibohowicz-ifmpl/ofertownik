// src/lib/api-helpers.ts
import type { Prisma } from '@prisma/client';

export type JValue = Prisma.JsonValue;
export type JObject = Prisma.JsonObject;

/** Zwróć obiekt JSON (pusty jeśli meta to nie-obiekt). */
export function asMeta(meta: JValue | null | undefined): JObject {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return meta as Prisma.JsonObject;
  }
  return {} as Prisma.JsonObject;
}

/** Odczyt z meta z bezpiecznym fallbackiem i typem. */
export function metaGet<T>(meta: JValue | null | undefined, key: string, fallback: T): T {
  const obj = asMeta(meta);
  return (obj[key] as T) ?? fallback;
}

/** Patch do meta – scala i usuwa undefined-y. */
export function metaPatch(meta: JValue | null | undefined, patch: Record<string, unknown>): JObject {
  const obj = asMeta(meta);
  const next: Record<string, unknown> = { ...obj, ...patch };
  // usuń klucze ustawione na undefined
  Object.keys(next).forEach((k) => {
    if (next[k] === undefined) delete next[k];
  });
  return next as Prisma.JsonObject;
}

/** Wyciągnij id z Next.js App Router ctx.params (Promise). */
export async function getParamId(ctx: { params: Promise<{ id: string }> }): Promise<string> {
  const { id } = await ctx.params;
  return id;
}
