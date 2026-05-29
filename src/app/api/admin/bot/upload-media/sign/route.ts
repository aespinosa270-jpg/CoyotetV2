import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/guard";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const { filename } = await req.json();
    if (!filename) {
      return NextResponse.json({ error: "Falta filename" }, { status: 400 });
    }

    const ext = String(filename).split(".").pop()?.toLowerCase() || "bin";
    const path = `crm-${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${ext}`;

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await admin.storage
      .from("whatsapp_media")
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json(
        { error: `No se pudo firmar: ${error?.message ?? "unknown"}` },
        { status: 500 }
      );
    }

    const { data: pub } = admin.storage
      .from("whatsapp_media")
      .getPublicUrl(path);

    return NextResponse.json({
      path: data.path,
      token: data.token,
      publicUrl: pub.publicUrl,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Error: ${msg}` }, { status: 500 });
  }
}