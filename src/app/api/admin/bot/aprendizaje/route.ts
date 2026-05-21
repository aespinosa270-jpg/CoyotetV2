/**
 * GET  /api/admin/bot/aprendizaje → lista reglas + historial análisis
 * POST /api/admin/bot/aprendizaje → trigger manual del análisis (sin esperar viernes)
 * PATCH /api/admin/bot/aprendizaje → toggle activa/inactiva una regla {id, activa}
 * DELETE /api/admin/bot/aprendizaje → borrar regla {id}
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/guard";
import {
  getLearnedRules,
  getAnalysisHistory,
  toggleRule,
  deleteRule,
} from "@/lib/bot/intelligence/learning/rules-repo";
import { runWeeklyLearningJob } from "@/lib/bot/intelligence/learning/weekly-analyzer";

export async function GET() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const [rules, history] = await Promise.all([
      getLearnedRules(),
      getAnalysisHistory(),
    ]);
    return NextResponse.json({
      ok: true,
      rules,
      history,
      counts: {
        total: rules.length,
        activas: rules.filter((r) => r.activa).length,
        inactivas: rules.filter((r) => !r.activa).length,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST() {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const result = await runWeeklyLearningJob();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = await req.json();
    const { id, activa } = body;
    if (!id || typeof activa !== "boolean") {
      return NextResponse.json({ error: "id y activa requeridos" }, { status: 400 });
    }
    const ok = await toggleRule(id, activa);
    return NextResponse.json({ ok });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const guard = await requireAdmin();
  if (guard) return guard;

  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "id requerido" }, { status: 400 });
    }
    const ok = await deleteRule(id);
    return NextResponse.json({ ok });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}