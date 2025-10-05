// src/app/offers/[id]/edit/page.tsx — kompaktowy wrapper (max do góry + md:gap-4)
import { prisma } from "@/lib/prisma";
import EditPanel from "../editPanel";
import EditDates from "../editDates"; // <-- dodaj do lewej kolumny!
import CostsPanel from "../costsPanel";
import InfoPanel from "../infoPanel";
import StatusPanel from "../statusPanel";
import StickyBannerClient from "../stickyBannerClient";
import { notFound } from 'next/navigation';

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    return (
      <main className="px-4 md:px-5 pt-2 md:pt-2 pb-4">
        <div className="rounded border border-amber-300 bg-amber-50 text-amber-800 p-3">
          Brak parametru <code>id</code> w adresie. <a className="underline" href="/offers">Wróć do listy</a>.
        </div>
      </main>
    );
  }

  const offer = await prisma.offer.findUnique({
    where: { id },
    select: {
      id: true,
      offerNo: true,
      title: true,
      valueNet: true,
      currency: true,
      costsSumNet: true,
      meta: true,
      client: { select: { id: true, name: true, street: true, postcode: true, city: true, nip: true, meta: true } },
      milestones: { select: { id: true, step: true, occurredAt: true } },
      author: { select: { initials: true } },
    },
  });
  if (!offer) return notFound();
  const meta =
    offer.meta && typeof offer.meta === 'object' && !Array.isArray(offer.meta)
      ? (offer.meta as any)
      : {};

  const initialData = {
    offerNo: offer.offerNo ?? "",
    title: offer.title ?? "",
    authorInitials: offer.author?.initials ?? "",
    vendorOrderNo: String(meta.vendorOrderNo ?? ""),
    contractor: String(meta.contractor ?? ""),
    valueNet: String(offer.valueNet ?? 0),
    wartoscKosztow: String(offer.costsSumNet ?? 0),
  };

  // Pobierz milestones z bazy
  const rows = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    orderBy: { occurredAt: "asc" },
    select: { step: true, occurredAt: true },
  });

  // Zamień Date → "YYYY-MM-DD"
  const initialRows = rows.map(r => ({
    step: r.step,
    occurredAt: (r.occurredAt as Date).toISOString().slice(0, 10),
  }));

  return (
    <main className="px-4 md:px-5 pt-2 md:pt-2 pb-4">
      {/* ⬇️ JEDEN globalny sticky baner o blokadzie edycji */}
      <StickyBannerClient offerId={offer.id} />

      <div className="mt-0 md:mt-0 flex gap-4 md:gap-4">
        {/* LEWA POŁOWA */}
        <div className="w-full md:w-1/2 space-y-4">
          <EditPanel
            id={offer.id}
            initialFields={initialData}
          />
          <EditDates
            offerId={offer.id}
            initialRows={initialRows}
          />
        </div>

        {/* PIONOWY PODZIAŁ */}
        <div className="hidden md:block w-px bg-gray-200" />

        {/* PRAWA POŁOWA */}
        <div className="w-full md:flex-1 space-y-3">
          <CostsPanel offerId={offer.id} />
          <InfoPanel offerId={offer.id} />
          <StatusPanel offerId={offer.id} />
          {/* <div className="text-sm text-gray-600">Podsumowanie statusu oferty i etapów.</div> */}
        </div>
      </div>
    </main>
  );
}
