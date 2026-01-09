import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/security/rateLimit";
import { auditLog } from "@/app/lib/security/audit";

export const runtime = "nodejs";

type ChatChannel = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

// global store
const KEY = Symbol.for("LMS_CHAT_CHANNELS");
const g = globalThis as any;
if (!g[KEY]) g[KEY] = [];
const channels: ChatChannel[] = g[KEY];

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`GET:chat:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  return NextResponse.json({ channels });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`POST:chat:${ip}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const name = (body?.name ?? "").toString().trim();
  const url = (body?.url ?? "").toString().trim();

  if (!name || !url) {
    return NextResponse.json({ error: "name ve url gerekli" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "url http/https ile başlamalı" }, { status: 400 });
  }

  const item: ChatChannel = {
    id: `chat_${Math.random().toString(16).slice(2)}`,
    name,
    url,
    createdAt: new Date().toISOString(),
  };

  channels.unshift(item);

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "CHAT_CHANNEL_ADD", name: item.name, url: item.url },
  });

  return NextResponse.json({ ok: true, channel: item });
}

export async function DELETE(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`DELETE:chat:${ip}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const idx = channels.findIndex((c) => c.id === id);
  if (idx === -1) return NextResponse.json({ error: "bulunamadı" }, { status: 404 });

  const removed = channels.splice(idx, 1)[0];

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "CHAT_CHANNEL_DELETE", name: removed.name, url: removed.url },
  });

  return NextResponse.json({ ok: true });
}
