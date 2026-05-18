import { NextRequest, NextResponse } from "next/server";
import { getConversation } from "@/lib/bot/repositories/conversation-repo";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json({ error: "Falta sessionId" }, { status: 400 });
  }

  try {
    const history = await getConversation(web: + sessionId);
    return NextResponse.json({ messages: history });
  } catch (error) {
    return NextResponse.json({ error: "Error leyendo historial" }, { status: 500 });
  }
}