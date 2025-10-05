// src/types/domain.ts

// type-only re-exports (OK dla isolatedModules)
export type { Offer, OfferCost, Client, User } from "@prisma/client";
export type OfferMilestone = import("@prisma/client").OfferMilestone;
