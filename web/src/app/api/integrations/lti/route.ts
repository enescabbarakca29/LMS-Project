import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/security/rateLimit";
import { auditLog } from "@/app/lib/security/audit";

export const runtime = "nodejs";

type LtiTool = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

// global store (route instance farklı olsa bile aynı kalsın)
const KEY = Symbol.for("LMS_LTI_TOOLS");
const g = globalThis as any;
if (!g[KEY]) g[KEY] = [];
const ltiTools: LtiTool[] = g[KEY];

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`GET:lti:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  return NextResponse.json({ tools: ltiTools });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`POST:lti:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").toString().trim();
  const url = (body?.url ?? "").toString().trim();

  if (!name || !url) {
    return NextResponse.json({ error: "name ve url gerekli" }, { status: 400 });
  }

  // basit URL kontrolü
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "url http/https ile başlamalı" }, { status: 400 });
  }

  const tool: LtiTool = {
    id: `lti_${Math.random().toString(16).slice(2)}`,
    name,
    url,
    createdAt: new Date().toISOString(),
  };

  ltiTools.unshift(tool);

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "LTI_TOOL_ADD", name: tool.name, url: tool.url },
  });

  return NextResponse.json({ ok: true, tool });
}

export async function DELETE(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`DELETE:lti:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const idx = ltiTools.findIndex((t) => t.id === id);
  if (idx === -1) return NextResponse.json({ error: "bulunamadı" }, { status: 404 });

  const removed = ltiTools.splice(idx, 1)[0];

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "LTI_TOOL_DELETE", name: removed.name, url: removed.url },
  });

  return NextResponse.json({ ok: true });
}
