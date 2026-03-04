import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json([]);

  const messages = await prisma.waMessage.findMany({
    where:   { conversationId },
    orderBy: { sentAt: "asc" },
  });

  return NextResponse.json(
    messages.map((m) => ({ ...m, sentAt: m.sentAt.toISOString() }))
  );
}