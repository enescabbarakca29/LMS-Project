import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/security/rateLimit";
import { auditLog } from "@/app/lib/security/audit";

export const runtime = "nodejs";

type MailItem = {
  id: string;
  to: string;
  subject: string;
  message: string;
  status: "MOCK_SENT";
  createdAt: string;
};

// global store (gönderilenleri listelemek için)
const KEY = Symbol.for("LMS_SENT_MAILS");
const g = globalThis as any;
if (!g[KEY]) g[KEY] = [];
const sent: MailItem[] = g[KEY];

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`GET:mail:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  return NextResponse.json({ sent: sent.slice(0, 50) });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`POST:mail:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const body = await req.json().catch(() => null);
  const to = (body?.to ?? "").toString().trim();
  const subject = (body?.subject ?? "").toString().trim();
  const message = (body?.message ?? "").toString().trim();

  if (!to || !subject || !message) {
    return NextResponse.json({ error: "to, subject, message gerekli" }, { status: 400 });
  }
  if (!isEmail(to)) {
    return NextResponse.json({ error: "to geçerli bir e-posta olmalı" }, { status: 400 });
  }

  // SMTP yerine mock gönderim:
  const item: MailItem = {
    id: `mail_${Math.random().toString(16).slice(2)}`,
    to,
    subject,
    message,
    status: "MOCK_SENT",
    createdAt: new Date().toISOString(),
  };

  sent.unshift(item);

  auditLog({
    at: new Date().toISOString(),
    action: "COURSE_EDIT",
    detail: { type: "SMTP_EMAIL_SENT", to: item.to, subject: item.subject },
  });

  // Console’da da gösterelim (demo)
  console.log("[SMTP:MOCK] Sent mail:", { to: item.to, subject: item.subject });

  return NextResponse.json({ ok: true, mail: item });
}
