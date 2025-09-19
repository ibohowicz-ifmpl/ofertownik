// scripts/backfill-offerMonth.ts
import { prisma } from "@/lib/prisma";
import { extractOfferMonth } from "@/lib/offerMonth";

async function main() {
  const BATCH = 500;
  let skip = 0;
  let total = 0;
  let updated = 0;

  console.log("Backfill offerMonth start…");

  for (;;) {
    const rows = await prisma.offer.findMany({
      skip,
      take: BATCH,
      select: { id: true, offerNo: true, offerMonth: true },
      orderBy: { id: "asc" },
    });

    if (rows.length === 0) break;
    total += rows.length;

    // przygotuj aktualizacje tylko tam, gdzie trzeba
    const changes = rows
      .map((r) => {
        const month = extractOfferMonth(r.offerNo);
        return month !== r.offerMonth ? { id: r.id, offerMonth: month } : null;
      })
      .filter(Boolean) as { id: string; offerMonth: string | null }[];

    // aktualizujemy w małych batchach, żeby nie zajechać DB
    for (const c of changes) {
      await prisma.offer.update({
        where: { id: c.id },
        data: { offerMonth: c.offerMonth },
      });
      updated++;
    }

    skip += rows.length;
    console.log(`Processed: ${skip} (updated: ${updated})`);
  }

  console.log(`Backfill done. scanned=${total} updated=${updated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
