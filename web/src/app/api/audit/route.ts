import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/app/lib/security/audit";
import { rateLimit } from "@/app/lib/security/rateLimit";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "local";
  const rl = rateLimit(`GET:audit:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Rate limit" }, { status: 429 });

  return NextResponse.json({ logs: getAuditLogs(100) });
}
