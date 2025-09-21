// src/lib/prisma-middleware.ts
import { extractOfferMonth } from "./offerMonth";

// middleware jako zwykła funkcja modyfikująca args
export function withOfferMonth(params: {
  model?: string;
  action?: string;
  args: any;
}) {
  if (params.model !== "Offer") return params;

  if (params.action === "create" || params.action === "update") {
    const data = params.args?.data;
    if (data?.offerNo) {
      const offerMonth = extractOfferMonth(data.offerNo);
      if (offerMonth) {
        params.args.data = { ...data, offerMonth };
      }
    }
  }

  return params;
}
