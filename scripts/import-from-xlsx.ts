// scripts/import-from-xlsx_final.ts
/**
 * Import z Excela do Ofertownika (Neon/Postgres) przez Prisma.
 * - Client.name: findFirst→create (bez @unique)
 * - Offer.offerNo: findFirst→update/create (bez @unique)
 * - Daty: Excel serial + ISO + Date, walidacja (1970–2100)
 * - offerMonth: offerDate → 'WYSLANIE' → najwcześniejszy milestone
 * - Milestones: BEZ createdAt/updatedAt
 * - Costs: Z createdAt/updatedAt i BEZ null (pozycje bez poprawnej kwoty są pomijane)
 *
 * Uruchomienie (preview):
 *   $env:DATABASE_URL="postgresql://neondb_owner:***HASLO***@ep-little-mud-ag9t31of.c-2.eu-central-1.aws.neon.tech/ofertownik_staging?sslmode=require"
 *   pnpm add -D tsx typescript @types/node
 *   pnpm add xlsx
 *   pnpm prisma generate
 *   pnpm exec tsx scripts/import-from-xlsx_final.ts --file .\ofertownik_import_template.xlsx
 */

import * as fs from "fs";
import * as path from "path";
import * as process from "process";
import * as XLSX from "xlsx";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Spacje: zwykłe + niełamliwe
const SPACE_RE = /[ \u00A0\u202F]/g;
function toNumberPL(text: any): number | null {
  if (text == null) return null;
  const s = String(text).trim().replace(SPACE_RE, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Excel serial -> YYYY-MM-DD (bazowa 1899-12-30)
function excelSerialToYMD(n: number): string | null {
  if (!Number.isFinite(n)) return null;
  const base = Date.UTC(1899, 11, 30);
  const ms = Math.round(n) * 24 * 60 * 60 * 1000;
  const d = new Date(base + ms);
  const year = d.getUTCFullYear();
  if (year < 1970 || year > 2100) return null;
  const y = d.getUTCFullYear();
  const m = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = d.getUTCDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toYMD(text: any): string | null {
  if (text == null) return null;
  if (text instanceof Date && !isNaN(text.getTime())) {
    const y = text.getUTCFullYear();
    if (y < 1970 || y > 2100) return null;
    return text.toISOString().slice(0, 10);
  }
  if (typeof text === "number") {
    return excelSerialToYMD(text);
  }
  const s = String(text).trim();
  if (s === "") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + "T00:00:00.000Z");
    const y = d.getUTCFullYear();
    if (isNaN(d.getTime()) || y < 1970 || y > 2100) return null;
    return s;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const y = d.getUTCFullYear();
    if (y >= 1970 && y <= 2100) return d.toISOString().slice(0, 10);
  }
  return null;
}

const STEPS = new Set([
  "WYSLANIE",
  "AKCEPTACJA_ZLECENIE",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
]);

type RowOffer = {
  offerNo: string;
  title: string;
  authorInitials?: string | null;
  contractor?: string | null;
  valueNet?: number | null;
  vendorOrderNo?: string | null;
  clientName?: string;
  offerDate?: string | null; // YYYY-MM-DD
};

async function ensureClientByName(nameRaw: string) {
  const name10 = nameRaw.toUpperCase().slice(0, 10);
  let found = await prisma.client.findFirst({
    where: { name: name10 },
    select: { id: true, name: true },
  });
  if (found) return found;
  const created = await prisma.client.create({
    data: { name: name10 },
    select: { id: true, name: true },
  });
  return created;
}

async function main() {
  const fileArgIdx = process.argv.indexOf("--file");
  if (fileArgIdx === -1 || !process.argv[fileArgIdx + 1]) {
    console.error("Użycie: pnpm exec tsx scripts/import-from-xlsx_final.ts --file ./plik.xlsx");
    process.exit(1);
  }
  const filePath = path.resolve(process.cwd(), process.argv[fileArgIdx + 1]);
  if (!fs.existsSync(filePath)) {
    console.error("Nie znaleziono pliku:", filePath);
    process.exit(1);
  }

  const wb = XLSX.read(fs.readFileSync(filePath), { type: "buffer" });

  const clients = XLSX.utils.sheet_to_json<{ clientName: string }>(wb.Sheets["Clients"] || {});
  const offers  = XLSX.utils.sheet_to_json<RowOffer>(wb.Sheets["Offers"]  || {});
  const milestonesRaw = XLSX.utils.sheet_to_json<{ offerNo: string; step: string; date: any }>(wb.Sheets["Milestones"] || {});
  const costs = XLSX.utils.sheet_to_json<{ offerNo: string; name: string; valueNet: any }>(wb.Sheets["Costs"] || {});

  // --- indeks do wyznaczania offerMonth z milestones
  const firstMilestoneYMDByOffer = new Map<string, string>();
  const wyslanieYMDByOffer = new Map<string, string>();
  for (const m of milestonesRaw) {
    const offerNo = (m.offerNo || "").trim();
    const step = (m.step || "").trim();
    const ymd = toYMD(m.date);
    if (!offerNo || !ymd) {
      if (offerNo) console.warn(`⚠️  Pomijam milestone z nieprawidłową datą dla ${offerNo}:`, m.date);
      continue;
    }
    if (!firstMilestoneYMDByOffer.has(offerNo) || ymd < (firstMilestoneYMDByOffer.get(offerNo) as string)) {
      firstMilestoneYMDByOffer.set(offerNo, ymd);
    }
    if (step === "WYSLANIE") {
      if (!wyslanieYMDByOffer.has(offerNo) || ymd < (wyslanieYMDByOffer.get(offerNo) as string)) {
        wyslanieYMDByOffer.set(offerNo, ymd);
      }
    }
  }

  const clientIdByName = new Map<string, string>();

  // 1) Klienci
  for (const c of clients) {
    const raw = (c.clientName || "").toString().trim();
    if (!raw) continue;
    const up = await ensureClientByName(raw);
    clientIdByName.set(up.name, up.id);
  }

  // 2) Oferty – findFirst ➜ update/create
  for (const o of offers) {
    const offerNo = (o.offerNo || "").trim();
    if (!offerNo) continue;

    const clientName = (o.clientName || "").toUpperCase().slice(0, 10);
    let clientId: string | null = null;
    if (clientName) {
      clientId = clientIdByName.get(clientName) || null;
      if (!clientId) {
        const ensured = await ensureClientByName(clientName);
        clientId = ensured.id;
        clientIdByName.set(ensured.name, ensured.id);
      }
    }

    const offerDateYMD = toYMD(o.offerDate);
    let offerMonth: string | null = null;
    if (offerDateYMD) offerMonth = offerDateYMD.slice(0,7);
    else if (wyslanieYMDByOffer.has(offerNo)) offerMonth = (wyslanieYMDByOffer.get(offerNo) as string).slice(0,7);
    else if (firstMilestoneYMDByOffer.has(offerNo)) offerMonth = (firstMilestoneYMDByOffer.get(offerNo) as string).slice(0,7);

    const dataBase: any = {
      title: (o.title || "").trim() || null,
      authorInitials: (o.authorInitials || "") || null,
      contractor: (o.contractor || "") || null,
      vendorOrderNo: (o.vendorOrderNo || "") || null,
      valueNet: o.valueNet ?? toNumberPL((o as any).valueNet),
    };
    if (clientId) dataBase.clientId = clientId;
    if (offerMonth) dataBase.offerMonth = offerMonth;

    const existing = await prisma.offer.findFirst({ where: { offerNo }, select: { id: true } });
    if (existing) {
      await prisma.offer.update({ where: { id: existing.id }, data: dataBase });
    } else {
      if (!clientId) {
        console.warn(`⚠️  Pomijam create dla '${offerNo}' – brak clientId (clientName nie podany lub nieprawidłowy).`);
        continue;
      }
      await prisma.offer.create({
        data: { offerNo, ...dataBase, clientId },
      });
    }
  }

  // 3) Milestones — replace dla danej oferty (BEZ createdAt/updatedAt)
  const milestonesByOffer = new Map<string, Array<{ step: string; ymd: string }>>();
  for (const m of milestonesRaw) {
    const offerNo = (m.offerNo || "").trim();
    const step = (m.step || "").trim();
    const ymd = toYMD(m.date);
    if (!offerNo || !STEPS.has(step) || !ymd) {
      if (offerNo) console.warn(`⚠️  Pomijam milestone (zła data lub step) dla ${offerNo}:`, m);
      continue;
    }
    const arr = milestonesByOffer.get(offerNo) || [];
    arr.push({ step, ymd });
    milestonesByOffer.set(offerNo, arr);
  }

  for (const [offerNo, arr] of milestonesByOffer.entries()) {
    const offer = await prisma.offer.findFirst({ where: { offerNo }, select: { id: true } });
    if (!offer) continue;
    await prisma.offerMilestone.deleteMany({ where: { offerId: offer.id } });
    await prisma.offerMilestone.createMany({
      data: arr.map(it => ({
        offerId: offer.id,
        step: it.step as any,
        occurredAt: new Date(it.ymd + "T12:00:00.000Z"),
      })),
      skipDuplicates: true,
    });
  }

  // 4) Koszty — replace, max 5 pierwszych (Z createdAt/updatedAt i BEZ null)
  const costsByOffer = new Map<string, Array<{ name: string; valueNet: number | null }>>();
  for (const c of costs) {
    const offerNo = (c.offerNo || "").trim();
    const name = (c.name || "").toString().trim();
    const val = toNumberPL(c.valueNet);
    if (!offerNo || !name) continue;
    const arr = costsByOffer.get(offerNo) || [];
    arr.push({ name, valueNet: val });
    costsByOffer.set(offerNo, arr);
  }

  for (const [offerNo, arr] of costsByOffer.entries()) {
    const offer = await prisma.offer.findFirst({ where: { offerNo }, select: { id: true } });
    if (!offer) continue;
    await prisma.offerCost.deleteMany({ where: { offerId: offer.id } });
    const now = new Date();
    const clean = arr.slice(0, 5).map(it => {
      const v = it.valueNet;
      const num = typeof v === "number" ? v : (v == null ? null : Number(v));
      if (num == null || !Number.isFinite(num)) {
        console.warn(`⚠️  Pomijam koszt bez poprawnej kwoty dla ${offerNo}: '${it.name}' (value='${v}')`);
        return null;
      }
      return {
        offerId: offer.id,
        name: it.name,
        valueNet: num,
        createdAt: now,
        updatedAt: now,
      };
    }).filter(Boolean) as any[];

    if (clean.length > 0) {
      await prisma.offerCost.createMany({ data: clean });
    }
  }

  console.log("Import zakończony ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
