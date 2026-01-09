import { getAuditStore } from "./auditStore";

export type AuditEvent =
  | "LOGIN"
  | "LOGOUT"
  | "COURSE_CREATE"
  | "COURSE_EDIT"
  | "SCORM_UPLOAD"
  | "QUIZ_IMPORT"
  | "QUIZ_EXPORT";

export type AuditRecord = {
  at: string; // ISO time
  userId?: string;
  courseId?: string;
  action: AuditEvent;
  detail?: Record<string, any>;
};

export function auditLog(record: AuditRecord) {
  const store = getAuditStore();
  store.unshift(record);
  console.log("[AUDIT]", record.action, record, "len=", store.length);
}

export function getAuditLogs(limit = 100) {
  const store = getAuditStore();
  return store.slice(0, limit);
}
