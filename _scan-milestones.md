# Raport: Użycie kroków (milestones) w projekcie

---

## A) Definicja enuma `OfferMilestoneStep` (schema.prisma)

```prisma
enum OfferMilestoneStep {
  WYSLANIE
  AKCEPTACJA
  WYKONANIE
  PROTOKOL_WYSLANY
  ODBIOR_PRAC
  PWF
}
```

---

## B) Użycia `OfferMilestone` i/lub `occurredAt`

### Przykładowe wyniki (fragmenty):

- **src/app/api/offers/[id]/milestones/route.ts**
  - linia 18: `const rows = await prisma.offerMilestone.findMany({ where: { offerId: id }, orderBy: { occurredAt: 'asc' }, select: { step: true, occurredAt: true }, });`
  - linia 63: `await prisma.offerMilestone.createMany({ data: toCreate.map(x => ({ offerId: id, step: x.step, occurredAt: x.occurredAt })), skipDuplicates: true, });`
  - linia 70: `const out = await prisma.offerMilestone.findMany({ where: { offerId: id }, orderBy: { occurredAt: 'asc' }, select: { step: true, occurredAt: true }, });`

- **src/app/offers/[id]/editDates.tsx**
  - linia 41: `const [dates, setDates] = useState<Record<string, string | null | undefined>>(initialDates ?? {});`
  - linia 90: `items.push({ step: k, occurredAt: v || "" });`
  - linia 104: `if (it?.step) updated[it.step] = normalizeDate(it.occurredAt);`

- **src/app/offers/page.tsx**
  - linia 87: `milestones: Array.isArray(o.milestones) ? o.milestones.map((m: any) => ({ step: String(m.step), occurredAt: m?.occurredAt ? new Date(m.occurredAt).toISOString() : null, })) : [],`

- **src/app/offers/[id]/edit/page.tsx**
  - linia 38: `milestones: { select: { id: true, step: true, occurredAt: true } },`

---

## C) Literalne nazwy kroków (case-insensitive)

### Przykładowe wyniki:

- **src/app/offers/[id]/editDates.tsx**
  - linia 10: `"WYSLANIE"`
  - linia 11: `"AKCEPTACJA"`
  - linia 12: `"WYKONANIE"`
  - linia 13: `"PROTOKOL_WYSLANY"`
  - linia 14: `"ODBIOR_PRAC"`
  - linia 15: `"PWF"`
  - linia 21: `WYSLANIE: "Data wysłania",`
  - linia 22: `AKCEPTACJA: "Data akceptacji",`
  - linia 23: `WYKONANIE: "Data wykonania",`
  - linia 24: `PROTOKOL_WYSLANY: "Data protokołu",`
  - linia 25: `ODBIOR_PRAC: "Data odbioru prac",`
  - linia 26: `PWF: "Data PWF",`

- **src/app/api/offers/[id]/milestones/route.ts**
  - linia 7: `'WYSLANIE',`
  - linia 8: `'AKCEPTACJA',`
  - linia 9: `'WYKONANIE',`
  - linia 10: `'PROTOKOL_WYSLANY',`
  - linia 11: `'ODBIOR_PRAC',`
  - linia 12: `'PWF',`
  - linia 16: `'AKCEPTACJA_ZLECENIE':  'AKCEPTACJA',`
  - linia 17: `'AKCEPTACJA_ZLECENIA':  'AKCEPTACJA',`
  - linia 18: `'AKCEPTACJA_ZAMOWIENIA':'AKCEPTACJA',`
  - linia 19: `'AKCEPTACJA_OFERTY':    'AKCEPTACJA',`
  - linia 20: `'AKCEPTACJA':           'AKCEPTACJA',`

- **src/app/offers/page.tsx**
  - linia 87: `step: String(m.step),`

---

## D) Wywołania endpointu `/api/offers/[id]/milestones` w kliencie

### Przykładowe wyniki:

- **src/app/offers/[id]/editDates.tsx**
  - linia 98:
    ```tsx
    const items: Array<{ step: string; occurredAt: string }> = [];
    for (const k of STEP_ORDER) {
      const v = dates[k];
      items.push({ step: k, occurredAt: v || "" });
    }
    await fetch(`/api/offers/${id}/milestones`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ replace: true, items }),
    });
    ```
    - **Payload:** `{ replace: true, items: [...] }`
    - **Mapowanie:** Każdy krok z STEP_ORDER, daty z formularza, jeśli brak daty: pusty string (sygnał do usunięcia).

  - linia 104:
    ```tsx
    await fetch(`/api/offers/${id}/milestones`, { cache: 'no-store' })
      .then(r => r.json())
      .then(res => {
        // res.items: [{ step, occurredAt: 'YYYY-MM-DD' }]
        // przemapuj na lokalny shape pól formularza i setState(...)
      });
    ```
    - **Payload:** GET, bez body, odbiór items.

---

**Uwaga:**  
Wszystkie wywołania PUT/POST używają formatu `{ replace: true, items: [...] }`, gdzie `items` to tablica `{ step, occurredAt }` (daty lub pusty string).

---