// src/app/api/offers/export/route.ts
import { prisma } from "@/lib/prisma";

// 12345,67 (PL: przecinek, bez spacji tysięcy)
function toPL(x: any) {
  if (x === null || x === undefined) return "";
  const n = Number(x);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("pl-PL", { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "15,20 %" jako TEKST dla Excela (nie zamieni na datę)
function toPLPercentText(x: any) {
  if (x === null || x === undefined) return "";
  const n = Number(x);
  if (Number.isNaN(n)) return "";
  const s = n.toLocaleString("pl-PL", { useGrouping: false, maximumFractionDigits: 2 });
  return "'" + s + " %"; // apostrof wymusza tekst
}

function sanitize(s?: string | null) {
  return (s ?? "").replace(/\t/g, " ").replace(/\r?\n/g, " ").trim();
}

export async function GET() {
  const rows = await prisma.offer.findMany({
    include: { client: true, milestones: { orderBy: { occurredAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  const header = ["Nr oferty","Tytuł","Odbiorca","Wartość netto","Wartość kosztów","Zysk","Marża","Etap","Utworzono"];
  const out: string[] = [];
  out.push(header.join("\t"));

  for (const o of rows) {
    const last = o.milestones[0];
    out.push([
      sanitize(o.offerNo),
      sanitize(o.title),
      sanitize(o.client?.name),
      toPL(o.valueNet),
      toPL(o.wartoscKosztow),
      toPL(o.zysk),
      toPLPercentText(o.marza), // <<< marża jako tekst
      sanitize(last?.step),
      new Date(o.createdAt).toISOString().slice(0,10),
    ].join("\t"));
  }

  const tsv = out.join("\r\n");
  const bytes = Buffer.from("\uFEFF" + tsv, "utf16le"); // UTF-16LE + BOM dla Excela

  return new Response(bytes, {
    headers: {
      "content-type": "text/tab-separated-values; charset=utf-16le",
      "content-disposition": 'attachment; filename="oferty.tsv"',
    },
  });
}
