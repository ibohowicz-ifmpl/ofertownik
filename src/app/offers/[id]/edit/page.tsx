// src/app/offers/[id]/edit/page.tsx — kompaktowy wrapper (max do góry + md:gap-4)
import { prisma } from "@/lib/prisma";
import EditPanel from "../editPanel";
import CostsPanel from "../costsPanel";
import InfoPanel from "../infoPanel";
import StatusPanel from "../statusPanel";
// import EditDates from "../editDates";
import StickyBannerClient from "../stickyBannerClient"; // ⬅️ DODANE
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

  // Mapowanie istniejących dat do YYYY-MM-DD (po kluczach enuma)
  const toYMD = (d?: Date | string | null) =>
    d ? new Date(d).toISOString().slice(0, 10) : '';
  const initialDates = {
    WYSLANIE:         toYMD(offer.milestones.find(m => m.step === 'WYSLANIE')?.occurredAt),
    AKCEPTACJA:       toYMD(offer.milestones.find(m => m.step === 'AKCEPTACJA')?.occurredAt),
    WYKONANIE:        toYMD(offer.milestones.find(m => m.step === 'WYKONANIE')?.occurredAt),
    PROTOKOL_WYSLANY: toYMD(offer.milestones.find(m => m.step === 'PROTOKOL_WYSLANY')?.occurredAt),
    ODBIOR_PRAC:      toYMD(offer.milestones.find(m => m.step === 'ODBIOR_PRAC')?.occurredAt),
    PWF:              toYMD(offer.milestones.find(m => m.step === 'PWF')?.occurredAt),
  };

  return (
    <main className="px-4 md:px-5 pt-2 md:pt-2 pb-4">
      {/* ⬇️ JEDEN globalny sticky baner o blokadzie edycji */}
      <StickyBannerClient offerId={offer.id} />

      <div className="mt-0 md:mt-0 flex gap-4 md:gap-4">
        {/* LEWA POŁOWA */}
        <div className="w-full md:w-1/2">
          <EditPanel
            id={offer.id}
            initialFields={initialData}
            initialDates={initialDates}
          />
        </div>

        {/* PIONOWY PODZIAŁ */}
        <div className="hidden md:block w-px bg-gray-200" />

        {/* PRAWA POŁOWA */}
        <div className="w-full md:flex-1 space-y-3">
          <CostsPanel offerId={offer.id} />
          <InfoPanel offerId={offer.id} />
          <StatusPanel offerId={offer.id} />
          {/* <EditDates offerId={offer.id} /> */}
        </div>
      </div>
    </main>
  );
}
