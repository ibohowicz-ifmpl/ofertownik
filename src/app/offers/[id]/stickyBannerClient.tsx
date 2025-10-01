// src/app/offers/[id]/stickyBannerClient.tsx
"use client";

import { StickyCancelBanner, useCancelStatus } from "./cancelGuard";

export default function StickyBannerClient({ offerId }: { offerId: string }) {
  const { isCancelled, reason, cancelledAt } = useCancelStatus(offerId);
  return (
    <StickyCancelBanner
      isCancelled={isCancelled}
      reason={reason}
      cancelledAt={cancelledAt}
    />
  );
}
