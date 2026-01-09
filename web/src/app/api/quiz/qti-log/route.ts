import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/security/rateLimit";
import { auditLog } from "@/app/lib/security/audit";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`POST:qti-log:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json().catch(() => null);

  const action = (body?.action ?? "").toString().trim(); // "QUIZ_IMPORT" | "QUIZ_EXPORT"
  const quizId = (body?.quizId ?? "").toString().trim();
  const courseId = (body?.courseId ?? "").toString().trim();

  if (!action || !quizId) {
    return NextResponse.json({ error: "action ve quizId gerekli" }, { status: 400 });
  }
  if (action !== "QUIZ_IMPORT" && action !== "QUIZ_EXPORT") {
    return NextResponse.json({ error: "action geçersiz" }, { status: 400 });
  }

  auditLog({
    at: new Date().toISOString(),
    action: action as any,
    detail: { type: action, quizId, courseId: courseId || undefined },
  });

  return NextResponse.json({ ok: true });
}
