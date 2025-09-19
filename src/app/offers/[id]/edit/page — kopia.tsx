// src/app/offers/[id]/edit/page.tsx
import { prisma } from "@/lib/prisma";
import EditPanel from "../editPanel";
import CostsPanel from "../costsPanel";
import InfoPanel from "../infoPanel";
import StatusPanel from "../statusPanel";

// ...
<div className="w-full md:flex-1 space-y-4">
  <CostsPanel offerId={offer.id} />
  <InfoPanel offerId={offer.id} />
  <StatusPanel offerId={offer.id} />
</div>

export const dynamic = "force-dynamic";

export default async function EditPage({ params }: { params: { id: string } }) {
  const id = params?.id;

  // Jeżeli z jakiegoś powodu brak parametru — pokaż komunikat zamiast 404
  if (!id) {
    return (
      <main className="p-6">
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

  // Zamiast notFound() wyświetlamy czytelną diagnostykę
  if (!offer) {
    return (
      <main className="p-6">
        <div className="rounded border border-amber-300 bg-amber-50 text-amber-800 p-3 space-y-2">
          <div>
            Nie znaleziono oferty o <b>id</b>: <code>{id}</code>
          </div>
          <div>
            Wejdź na <a className="underline" href="/offers">/offers</a> i kliknij <b>Edytuj</b> przy istniejącej pozycji,
            żeby przejść z poprawnym identyfikatorem.
          </div>
        </div>
      </main>
    );
  }

  // mapowanie dat (tylko jeśli istnieją)
  const dates: Record<string, string> = {};
  for (const m of offer.milestones) {
    if (!m.occurredAt) continue;
    const d = new Date(m.occurredAt);
    const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    dates[m.step] = x.toISOString().slice(0, 10);
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
    <main className="p-6">
      <div className="flex gap-6">
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
        <div className="w-full md:flex-1">
          <CostsPanel offerId={offer.id} />
        </div>
      </div>
    </main>
  );
}
