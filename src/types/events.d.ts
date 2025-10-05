export type OfferDatesSavedDetail = { offerId: string };

export type OfferCostsSavedDetail = {
  offerId: string;
  sumNet?: number; // opcjonalne
};

declare global {
  interface WindowEventMap {
    "offer-dates-saved": CustomEvent<OfferDatesSavedDetail>;
    "offer-costs-saved": CustomEvent<OfferCostsSavedDetail>;
  }
}
export {};