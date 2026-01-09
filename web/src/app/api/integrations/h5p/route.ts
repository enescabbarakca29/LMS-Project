import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/security/rateLimit";
import { auditLog } from "@/app/lib/security/audit";

export const runtime = "nodejs";

type H5pItem = {
  id: string;
  title: string;
  url: string;
  createdAt: string;
};

const KEY = Symbol.for("LMS_H5P_ITEMS");
const g = globalThis as any;
if (!g[KEY]) g[KEY] = [];
const items: H5pItem[] = g[KEY];

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`GET:h5p:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`POST:h5p:${ip}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const title = (body?.title ?? "").toString().trim();
  const url = (body?.url ?? "").toString().trim();

  if (!title || !url) {
    return NextResponse.json({ error: "title ve url gerekli" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "url http/https ile başlamalı" }, { status: 400 });
  }

  const item: H5pItem = {
    id: `h5p_${Math.random().toString(16).slice(2)}`,
    title,
    url,
    createdAt: new Date().toISOString(),
  };

  items.unshift(item);

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "H5P_EMBED_ADD", title: item.title, url: item.url },
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`DELETE:h5p:${ip}`, 40, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const idx = items.findIndex((x) => x.id === id);
  if (idx === -1) return NextResponse.json({ error: "bulunamadı" }, { status: 404 });

  const removed = items.splice(idx, 1)[0];

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "H5P_EMBED_DELETE", title: removed.title, url: removed.url },
  });

  return NextResponse.json({ ok: true });
}
