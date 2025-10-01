// src/app/offers/[id]/edit/page.tsx — kompaktowy wrapper (max do góry + md:gap-4)
import { prisma } from "@/lib/prisma";
import EditPanel from "../editPanel";
import CostsPanel from "../costsPanel";
import InfoPanel from "../infoPanel";
import StatusPanel from "../statusPanel";
// import EditDates from "../editDates";
import StickyBannerClient from "../stickyBannerClient"; // ⬅️ DODANE

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
    include: { client: true, milestones: true },
  });

  if (!offer) {
    return (
      <main className="px-4 md:px-5 pt-2 md:pt-2 pb-4">
        <div className="rounded border border-amber-300 bg-amber-50 text-amber-800 p-3 space-y-2">
          <div>
            Nie znaleziono oferty o <b>id</b>: <code>{id}</code>
          </div>
          <div>
            Wejdź na <a className="underline" href="/offers">/offers</a> i kliknij <b>Edytuj</b> przy istniejącej pozycji.
          </div>
        </div>
      </main>
    );
  }

  // Mapowanie istniejących dat do YYYY-MM-DD
  const dates: Record<string, string> = {};
  for (const m of offer.milestones) {
    if (!m.occurredAt) continue;
    const d = new Date(m.occurredAt);
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    dates[m.step] = iso;
  }

  const fields = {
    offerNo: offer.offerNo ?? "",
    title: offer.title ?? "",
    authorInitials: offer.authorInitials ?? "",
    vendorOrderNo: offer.vendorOrderNo ?? "",
    contractor: offer.contractor ?? "",
    valueNet: offer.valueNet != null ? String(offer.valueNet) : "",
    wartoscKosztow: offer.wartoscKosztow != null ? String(offer.wartoscKosztow) : "",
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
            initialFields={fields}
            initialDates={dates}
            initialClient={{ id: offer.clientId, name: offer.client?.name ?? "" }}
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
