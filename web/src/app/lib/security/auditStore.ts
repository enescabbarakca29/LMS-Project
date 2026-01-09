import type { AuditRecord } from "./audit";

// Global key (Symbol) ile çakışma riski minimum
const KEY = Symbol.for("LMS_AUDIT_STORE");

type GlobalWithAudit = typeof globalThis & {
  [KEY]?: AuditRecord[];
};

export function getAuditStore(): AuditRecord[] {
  const g = globalThis as GlobalWithAudit;

  if (!g[KEY]) g[KEY] = [];
  return g[KEY]!;
}
