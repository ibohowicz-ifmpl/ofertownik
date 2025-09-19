// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import registerOfferMonthMiddleware from "./prisma-middleware";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  _offerMonthMW?: boolean;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"], // mniej szumu
  });

// Zarejestruj middleware tylko raz (ważne w dev przy HMR)
if (!globalForPrisma._offerMonthMW) {
  registerOfferMonthMiddleware(prisma);
  globalForPrisma._offerMonthMW = true;
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
