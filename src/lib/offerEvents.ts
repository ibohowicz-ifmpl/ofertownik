export type OfferSavedDetail = { offerId: string; sumNet?: number };

export const emit = {
  dataSaved: (offerId: string) =>
    window.dispatchEvent(new CustomEvent<OfferSavedDetail>("offer-data-saved", { detail: { offerId } })),
  datesSaved: (offerId: string) =>
    window.dispatchEvent(new CustomEvent<OfferSavedDetail>("offer-dates-saved", { detail: { offerId } })),
  costsSaved: (offerId: string, sumNet?: number) =>
    window.dispatchEvent(new CustomEvent<OfferSavedDetail>("offer-costs-saved", { detail: { offerId, sumNet } })),
  infoSaved: (offerId: string) =>
    window.dispatchEvent(new CustomEvent<OfferSavedDetail>("offer-info-saved", { detail: { offerId } })),
};
