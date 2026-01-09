import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/security/rateLimit";
import { auditLog } from "@/app/lib/security/audit";

export const runtime = "nodejs";

type Provider = "jitsi" | "bbb";

function slugRoom(prefix: string) {
  const rnd = Math.random().toString(16).slice(2, 8);
  return `${prefix}-${Date.now()}-${rnd}`;
}

// local store: son üretilen oturumları saklayalım
const KEY = Symbol.for("LMS_LIVE_SESSIONS");
const g = globalThis as any;
if (!g[KEY]) g[KEY] = [];
const sessions = g[KEY] as Array<{
  id: string;
  provider: Provider;
  room: string;
  url: string;
  createdAt: string;
}>;

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`GET:live:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  return NextResponse.json({ sessions: sessions.slice(0, 50) });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`POST:live:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const provider = (body?.provider ?? "jitsi") as Provider;

  if (provider !== "jitsi" && provider !== "bbb") {
    return NextResponse.json({ error: "provider jitsi veya bbb olmalı" }, { status: 400 });
  }

  // Jitsi: public instance
  // BBB: burada gerçek API handshake yok (mock); yine link üretiyoruz + açıklama
  const room = slugRoom(provider === "jitsi" ? "lms-jitsi" : "lms-bbb");
  const url =
    provider === "jitsi"
      ? `https://meet.jit.si/${encodeURIComponent(room)}`
      : `https://your-bbb-server.example/join/${encodeURIComponent(room)}`; // mock

  const item = {
    id: `live_${Math.random().toString(16).slice(2)}`,
    provider,
    room,
    url,
    createdAt: new Date().toISOString(),
  };

  sessions.unshift(item);

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "LIVE_SESSION_CREATE", provider: item.provider, room: item.room, url: item.url },
  });

  return NextResponse.json({ ok: true, session: item });
}
