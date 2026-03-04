import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { conversationId, body, employeeId } = await req.json();
  if (!conversationId || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.waMessage.create({
      data: { conversationId, role: "AGENT", body, isRead: false },
    }),
    prisma.waConversation.update({
      where: { id: conversationId },
      data:  { lastMessage: body, lastMessageAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ...message, sentAt: message.sentAt.toISOString() });
}
