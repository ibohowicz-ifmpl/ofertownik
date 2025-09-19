// src/app/api/offers/[id]/milestones/route.ts
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { step, occurredAt } = await req.json();
  if (!step) return new Response("step required", { status: 400 });

  await prisma.offerMilestone.create({
    data: {
      offerId: params.id,
      step, // np. "WYSLANIE"
      occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    },
  });

  return new Response("OK");
}
