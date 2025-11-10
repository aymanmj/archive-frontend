// src/api/audit.ts

import api from "./apiClient";

export type AuditItem = {
  id: string;
  actionType: string;
  actionDescription: string | null;
  userId: number | null;
  userName: string | null;
  documentId: string | null;
  documentTitle: string | null;
  fromIP: string | null;
  workstationName: string | null;
  createdAt: string | null; // ISO
};

export type SearchAuditParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  userId?: number;
  documentId?: string;
  actionType?: string;
  from?: string;
  to?: string;
};

export type SearchAuditResponse = {
  items: AuditItem[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
};

function unwrap<T = any>(payload: any): T {
  if (!payload) return payload as T;
  if (typeof payload === "object" && "success" in payload) {
    return (payload.success ? payload.data : null) as T;
  }
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as any).data as T;
  }
  return payload as T;
}

function toQuery(params: Record<string, any>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

export async function searchAudit(params: SearchAuditParams): Promise<SearchAuditResponse> {
  const qs = toQuery({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    q: params.q ?? "",
    userId: params.userId,
    documentId: params.documentId,
    actionType: params.actionType,
    from: params.from,
    to: params.to,
  });
  const res = await api.get(`/audit${qs}`);
  const data = unwrap<any>(res.data) ?? {};

  // ندعم: {items,total,page,pageSize,pages} أو {results,count,...} أو مصفوفة مباشرة
  const itemsRaw =
    (Array.isArray(data.items) ? data.items : null) ??
    (Array.isArray(data.results) ? data.results : null) ??
    (Array.isArray(data) ? data : []);

  const items: AuditItem[] = itemsRaw.map((r: any) => ({
    id: String(r.id ?? r.auditId ?? ""),
    actionType: r.actionType ?? r.action ?? "UNKNOWN",
    actionDescription: r.actionDescription ?? r.description ?? null,
    userId: r.userId != null ? Number(r.userId) : null,
    userName: r.userName ?? r.user ?? null,
    documentId: r.documentId != null ? String(r.documentId) : null,
    documentTitle: r.documentTitle ?? r.docTitle ?? null,
    fromIP: r.fromIP ?? null,
    workstationName: r.workstationName ?? null,
    createdAt: r.createdAt ?? r.ts ?? null,
  }));

  const total = Number(
    data.total ?? data.count ?? (Array.isArray(itemsRaw) ? itemsRaw.length : 0)
  );
  const page = Number(data.page ?? params.page ?? 1);
  const pageSize = Number(data.pageSize ?? params.pageSize ?? 20);
  const pages = Number(data.pages ?? Math.max(1, Math.ceil(total / Math.max(1, pageSize))));

  return { items, total, page, pageSize, pages };
}
