Założenia i docelowy model bazy – System Obsługi Ofert

Założenia biznesowe (finalne)
•	Jedna baza (Postgres) – moduł kalkulacji/dokumentów współdzieli encje Oferty; brak duplikowania danych.
•	Sprzedaż vs koszty: Offer.valueNet (baseline sprzedaży) ustalane przy finalizacji oferty; rzeczywiste koszty zapisywane w OfferCost (nie wynikają z oferty).
•	Dokumenty (Oferta, Protokół, PWF) – generowane do storage S3/MinIO (bucket prywatny), w DB tylko metadane/status/hash.
•	MPK – kluczowy wymiar dostępu i raportowania. MPK.code3 jest niezmienialne.
•	Role i dostęp – per MPK przez UserMPK.role (LEADER|MANAGER|PM|VIEWER) + role globalne (FINANCE|EXEC|ADMIN).
•	Numeracja oferty – nadawana przy finalizacji, format: {MPK.code3}/{YYYY}/{MM}/{DD}/{INITIALS}/{NNN}; sekwencja dzienna per (MPK, initials).
•	Inicjały użytkownika – User.initials unikat w systemie; polityka kolizji: AB → ABI → AB1….
•	PWF – zawsze używa danych rozliczeniowych z Client (NIP, nazwa, adres). Na start pojedynczy adres; wieloadresowość możliwa w przyszłości.
•	Audyt – zdarzenia krytyczne zapisywane append‑only w AuditLog.
•	Ewolucja bez migracji – pola meta jsonb na drobne rozszerzenia; brak fizycznych kasowań (soft‑delete isActive).

Przepływ procesu (docelowy, wysokopoziomowo)
•	Kalkulacja (draft) → Finalizacja (nadanie numeru, ustalenie valueNet, PDF Oferty) → Wysłanie (milestone WYSLANIE) → Realizacja (koszty rzeczywiste) → Protokół (PDF, PROTOKOL_WYSLANY) → Odbiór → PWF (PDF, PWF).

Panel Administratora – dane referencyjne
•	MPK zakładamy w pierwszej kolejności; code3 immutable.
•	Użytkownicy: dane kontaktowe + initials + przypisania do MPK/roli (UserMPK).
•	Klienci: unikat NIP; przypisanie do MPK (ClientMPK); kontakty (ClientContact).
•	Kreator oferty: MPK → Klient (filtrowanie po MPK) → Kontakt (po kliencie) → Kalkulacja → Finalizacja.

Docelowy model bazy (schema) – skrót
•	User(id, email unique, firstName, lastName, initials unique, phone, position, defaultMpkId?, globalRole, isActive, createdAt, updatedAt).
•	MPK(id, code3 unique immutable, name, street, postcode, city, active).
•	UserMPK(userId, mpkId, role: LEADER|MANAGER|PM|VIEWER) – unikat pary.
•	Client(id, nip unique, name, street, postcode, city, isActive, notes, meta jsonb).
•	ClientMPK(clientId, mpkId, billingNotes) – unikat pary.
•	ClientContact(id, clientId, firstName, lastName, email, phone, roleTitle, isActive, meta jsonb).
•	Offer(id, offerNo unique, mpkId, clientId, clientContactId?, title, valueNet, currency, authorUserId, status, createdAt, finalizedAt?, meta jsonb).
•	OfferItem(id, offerId, lp, name, qty, unit, priceSuggested, totalSuggested, priceOnOffer, totalOnOffer, showOnOffer, meta jsonb).
•	OfferTerms(id, offerId unique, validityDays, deliveryDesc, vatRate, meta jsonb).
•	OfferMilestone(id, offerId, step enum(WYSLANIE|AKCEPTACJA|WYKONANIE|PROTOKOL_WYSLANY|ODBIOR_PRAC|PWF), occurredAt) – unikat (offerId, step).
•	OfferDocument(id, offerId, type enum(OFFER|PROTOKOL|PWF), status enum(DRAFT|FINAL|SENT), version, fileKey, fileName, mime, sizeBytes, sha256, generatedAt, sentAt?, metadata jsonb).
•	OfferNoSequence((mpkId, yyyymmdd, initials) PK, lastNo).
•	OfferCost(id, offerId, postedAt, category, vendor, invoiceNo, amountNet, meta jsonb).
•	AuditLog(id, userId, offerId?, action, at, meta jsonb).

Indeksy i wydajność (na starcie)
•	Offer: indeksy po (mpkId), (clientId), (createdAt desc), (finalizedAt desc), (offerNo).
•	UserMPK(userId, mpkId) unique; Client(nip unique), (name); ClientMPK(mpkId, clientId) unique; ClientContact(clientId); OfferCost(offerId, postedAt).
•	Cache sumy kosztów: Offer.costsSumNet + trigger na OfferCost (INSERT/UPDATE/DELETE) – KPI i lista ofert bez drogich SUM.

Reguły i walidacje (produkcyjne)
•	MPK.code3 – niezmienialne; zmiana = nowy rekord MPK.
•	Numer oferty – generowany przy finalizacji z sekwencji dziennej per (MPK, initials).
•	User.initials – unikalne; polityka kolizji AB → ABI → AB1…; edycja tylko przez Admina.
•	PWF – pobiera dane z Client (NIP/nazwa/adres).
•	clientContactId musi należeć do clientId (walidacja w API).
•	Soft‑delete przez isActive; brak fizycznych kasowań rekordów referencyjnych.

Uprawnienia (wysokopoziomowo)
•	UserMPK.role: LEADER, MANAGER, PM, VIEWER.
•	LEADER/MANAGER/PM → R/W w przypisanych MPK (tworzenie ofert); VIEWER/FINANCE/EXEC → RO.
•	Domyślne MPK w User.defaultMpkId; PM może przełączać MPK w kreatorze.
•	(Opcjonalnie) RLS w Postgres – polityki po current_setting('app.user_id') + widoki na UserMPK.

Dokumenty – cykl życia i zgodność
•	Draft → Final: render HTML→PDF; zapis w storage; OfferDocument(status=FINAL, version++).
•	Wysyłka: sentAt=now, status=SENT + ustaw milestone (np. WYSLANIE).
•	Wersjonowanie: nowe finalizacje nie nadpisują – rośnie version.
•	Integralność: sha256; pre‑signed URL; retencja (np. 2 lata + archiwum).

API (stabilne kontrakty – kierunkowo)
•	GET/PUT /api/offers/:id/fields – valueNet RO po finalizacji; zwraca costsSumNet (z cache).
•	GET/PUT /api/offers/:id/items – pozycje kalkulacji.
•	POST /api/offers/:id/finalize – nadaje offerNo, zamraża wartości „na ofercie”, tworzy OfferDocument(OFFER, FINAL).
•	POST /api/offers/:id/documents – generacja/lista; POST /api/offers/:id/documents/:docId/send – oznaczenie „wysłano”.
•	GET/POST /api/offers/:id/costs – koszty; trigger aktualizuje costsSumNet.
•	/api/admin/users|mpk|clients|contacts – CRUD do panelu administratora (z filtrami po MPK).

Uwagi o skali (bez zmian schematu)
•	Partycjonowanie po roku (Offer, OfferCost, OfferDocument) możliwe bez zmiany kontraktów.
•	Słowniki (np. kategorie kosztów) – dziś varchar + walidacja; później opcjonalna tabela bez modyfikacji istniejących kolumn.
•	Pola meta (jsonb) – miejsce na drobne rozszerzenia bez migracji bazy.

Road mapa wykonawcza (etapy)
•	Etap 1 – Migracje i dane referencyjne: tabele MPK, User, UserMPK, Client, ClientMPK, ClientContact, OfferItem, OfferTerms, OfferDocument, OfferMilestone, OfferNoSequence, AuditLog; walidacje i indeksy.
•	Etap 2 – Autoryzacja i filtrowanie po MPK: middleware API (UserMPK + role), domyślne MPK użytkownika.
•	Etap 3 – Moduł kalkulacji (OfferItems): CRUD pozycji, flagi showOnOffer, sumowanie.
•	Etap 4 – Finalizacja oferty i numeracja: endpoint finalize, sekwencja dzienna per (MPK, initials), zapis Offer.valueNet, AuditLog.
•	Etap 5 – Generowanie dokumentów (Oferta): szablon HTML→PDF, OfferDocument(type=OFFER, status=FINAL, version).
•	Etap 6 – Milestones z dokumentów: „Oznacz jako wysłany” → sentAt + milestone WYSLANIE; event do StatusPanel.
•	Etap 7 – Dokumenty Protokół i PWF: szablony PROTOKÓŁ/PWF, mapowanie na milestones (PROTOKOL_WYSLANY, PWF).
•	Etap 8 – Koszty (OfferCost) + KPI: CRUD kosztów, trigger cache Offer.costsSumNet, KPI (profit, margin).
•	Etap 9 – Panel Administratora: CRUD Users/MPK/Clients/Contacts, przypisania UserMPK/ClientMPK; kreator oferty filtruje listy.
•	Etap 10 – Audyt i bezpieczeństwo: AuditLog na finalize/send, retencja dokumentów, sha256.
•	Etap 11 – Wydajność i skalowanie: paginacja, selektywne SELECTy, indeksy kompozytowe, opcjonalnie MV/par
