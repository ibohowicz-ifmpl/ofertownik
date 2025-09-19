// src/app/offers/[id]/edit/page.tsx
import { prisma } from "@/lib/prisma";
import EditOfferForm from "../editForm";

export default async function EditPage({ params }: { params: { id: string } }) {
  const offer = await prisma.offer.findUnique({
    where: { id: params.id },
    include: { client: true },
  });
  if (!offer) return <main className="p-6">Nie znaleziono oferty.</main>;

  return (
    <main className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold mb-2">Edycja oferty</h1>
      <p className="text-sm text-gray-600 mb-4">
        {offer.offerNo ?? "(bez numeru)"} — {offer.title ?? "—"} — {offer.client?.name ?? "—"}
      </p>
      <EditOfferForm
        id={offer.id}
        vendorOrderNo={offer.vendorOrderNo ?? ""}
        contractor={offer.contractor ?? ""}
        valueNet={offer.valueNet ? String(offer.valueNet) : ""}
        wartoscKosztow={offer.wartoscKosztow ? String(offer.wartoscKosztow) : ""}
      />
      <div className="mt-4">
        <a className="text-blue-600 hover:underline" href="/offers">← Powrót do listy</a>
      </div>
    </main>
  );
}
