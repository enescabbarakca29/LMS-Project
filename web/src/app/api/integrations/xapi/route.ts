import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/security/rateLimit";
import { auditLog } from "@/app/lib/security/audit";

export const runtime = "nodejs";

type XApiVerb = "initialized" | "experienced" | "completed" | "answered" | "passed" | "failed";

type XApiStatement = {
  id: string;
  actor: { userId: string; name?: string };
  verb: XApiVerb;
  object: { type: "course" | "module" | "content" | "quiz"; id: string; title?: string };
  result?: { success?: boolean; score?: number };
  timestamp: string;
};

// global store
const KEY = Symbol.for("LMS_XAPI_STATEMENTS");
const g = globalThis as any;
if (!g[KEY]) g[KEY] = [];
const statements: XApiStatement[] = g[KEY];

function safeStr(v: any) {
  return (v ?? "").toString().trim();
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`GET:xapi:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  // opsiyonel filtre: userId
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  const data = userId
    ? statements.filter((s) => s.actor.userId === userId).slice(0, 200)
    : statements.slice(0, 200);

  return NextResponse.json({ statements: data });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`POST:xapi:${ip}`, 80, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json().catch(() => null);

  const userId = safeStr(body?.actor?.userId);
  const name = safeStr(body?.actor?.name);

  const verb = safeStr(body?.verb) as XApiVerb;

  const objType = safeStr(body?.object?.type) as XApiStatement["object"]["type"];
  const objId = safeStr(body?.object?.id);
  const objTitle = safeStr(body?.object?.title);

  if (!userId || !verb || !objType || !objId) {
    return NextResponse.json(
      { error: "actor.userId, verb, object.type, object.id gerekli" },
      { status: 400 }
    );
  }

  const allowedVerbs: XApiVerb[] = ["initialized", "experienced", "completed", "answered", "passed", "failed"];
  if (!allowedVerbs.includes(verb)) {
    return NextResponse.json({ error: "verb geçersiz" }, { status: 400 });
  }

  const allowedTypes: XApiStatement["object"]["type"][] = ["course", "module", "content", "quiz"];
  if (!allowedTypes.includes(objType)) {
    return NextResponse.json({ error: "object.type geçersiz" }, { status: 400 });
  }

  const result = body?.result && typeof body.result === "object" ? body.result : undefined;

  const st: XApiStatement = {
    id: `xapi_${Math.random().toString(16).slice(2)}`,
    actor: { userId, name: name || undefined },
    verb,
    object: { type: objType, id: objId, title: objTitle || undefined },
    result,
    timestamp: new Date().toISOString(),
  };

  statements.unshift(st);

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "XAPI_RECORD", userId: st.actor.userId, verb: st.verb, object: st.object },
  });

  return NextResponse.json({ ok: true, statement: st });
}
