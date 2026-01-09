import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/security/rateLimit";
import { auditLog } from "@/app/lib/security/audit";

export const runtime = "nodejs";

type ScormItem = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
};

const scormStore: ScormItem[] = [];

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`GET:scorm:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  return NextResponse.json({ items: scormStore });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`POST:scorm:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  const formData = await req.formData();
  const file = formData.get("file");

  // Next route’larda en sağlam kontrol
  if (!file || typeof (file as any).name !== "string") {
    return NextResponse.json({ error: "file gerekli" }, { status: 400 });
  }

  const f = file as File;

  if (!f.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "SCORM paketi .zip olmalı" }, { status: 400 });
  }

  const item: ScormItem = {
    id: `scorm_${Math.random().toString(16).slice(2)}`,
    name: f.name,
    size: f.size,
    uploadedAt: new Date().toISOString(),
  };

  scormStore.unshift(item);

  auditLog({
    at: new Date().toISOString(),
    action: "SCORM_UPLOAD",
    detail: { name: item.name, size: item.size },
  });

  return NextResponse.json({ ok: true, item });
}
