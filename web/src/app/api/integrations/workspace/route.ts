import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/security/rateLimit";
import { auditLog } from "@/app/lib/security/audit";

export const runtime = "nodejs";

type LinkType = "google_calendar" | "teams_meeting" | "drive_link";

type WorkspaceLink = {
  id: string;
  type: LinkType;
  title: string;
  url: string;
  createdAt: string;
};

// global store
const KEY = Symbol.for("LMS_WORKSPACE_LINKS");
const g = globalThis as any;
if (!g[KEY]) g[KEY] = [];
const links: WorkspaceLink[] = g[KEY];

function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(url);
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`GET:workspace:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  return NextResponse.json({ links });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`POST:workspace:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const type = (body?.type ?? "").toString().trim() as LinkType;
  const title = (body?.title ?? "").toString().trim();
  const url = (body?.url ?? "").toString().trim();

  if (!type || !title || !url) {
    return NextResponse.json({ error: "type, title, url gerekli" }, { status: 400 });
  }
  if (!["google_calendar", "teams_meeting", "drive_link"].includes(type)) {
    return NextResponse.json({ error: "type geçersiz" }, { status: 400 });
  }
  if (!isHttpUrl(url)) {
    return NextResponse.json({ error: "url http/https ile başlamalı" }, { status: 400 });
  }

  const item: WorkspaceLink = {
    id: `ws_${Math.random().toString(16).slice(2)}`,
    type,
    title,
    url,
    createdAt: new Date().toISOString(),
  };

  links.unshift(item);

  const auditType =
    type === "google_calendar"
      ? "CALENDAR_LINK_ADD"
      : type === "teams_meeting"
      ? "TEAMS_LINK_ADD"
      : "DRIVE_LINK_ADD";

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: auditType, title: item.title, url: item.url },
  });

  return NextResponse.json({ ok: true, link: item });
}

export async function DELETE(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`DELETE:workspace:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id gerekli" }, { status: 400 });

  const idx = links.findIndex((x) => x.id === id);
  if (idx === -1) return NextResponse.json({ error: "bulunamadı" }, { status: 404 });

  const removed = links.splice(idx, 1)[0];

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "WORKSPACE_LINK_DELETE", linkType: removed.type, title: removed.title, url: removed.url },
  });

  return NextResponse.json({ ok: true });
}
