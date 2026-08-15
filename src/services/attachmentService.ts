import * as DocumentPicker from "expo-document-picker";
import { http } from "./http";

export interface AttachmentPolicy {
  mode: "hidden" | "optional" | "required";
  maxFiles: number;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export interface RequestAttachment {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at?: string | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

export const attachmentService = {
  /** Effective policy for a request kind (mode hidden = feature off for this company). */
  async getPolicy(kind: string): Promise<AttachmentPolicy | null> {
    try {
      const res = await http.get(`/api/request-attachments/policy?kind=${encodeURIComponent(kind)}`);
      const d = isRecord(res.data) ? (res.data as { data?: unknown }).data : null;
      if (!isRecord(d)) return null;
      return {
        mode: (d.mode as AttachmentPolicy["mode"]) ?? "hidden",
        maxFiles: Number(d.maxFiles ?? 0),
        maxSizeBytes: Number(d.maxSizeBytes ?? 0),
        allowedMimeTypes: Array.isArray(d.allowedMimeTypes) ? (d.allowedMimeTypes as string[]) : [],
      };
    } catch {
      return null;
    }
  },

  async list(kind: string, requestId: string): Promise<RequestAttachment[]> {
    try {
      const res = await http.get(
        `/api/request-attachments?request_kind=${encodeURIComponent(kind)}&request_id=${encodeURIComponent(requestId)}`
      );
      const d = isRecord(res.data) ? (res.data as { data?: unknown }).data : null;
      const items = isRecord(d) && Array.isArray((d as { items?: unknown }).items) ? ((d as { items: unknown[] }).items) : [];
      return items
        .filter(isRecord)
        .map((r) => ({
          id: String(r.id ?? ""),
          file_name: String(r.file_name ?? ""),
          mime_type: String(r.mime_type ?? ""),
          size_bytes: Number(r.size_bytes ?? 0),
          created_at: r.created_at != null ? String(r.created_at) : null,
        }))
        .filter((r) => r.id);
    } catch {
      return [];
    }
  },

  /** Opens the document picker (single file). Returns the picked asset or null if cancelled. */
  async pickDocument(): Promise<{ uri: string; name: string; mimeType: string; size: number } | null> {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/jpeg", "image/png"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets || !res.assets[0]) return null;
    const a = res.assets[0];
    return { uri: a.uri, name: a.name ?? "file", mimeType: a.mimeType ?? "application/octet-stream", size: a.size ?? 0 };
  },

  /** Uploads a file to a request. Server re-enforces policy (type/size/count). */
  async upload(kind: string, requestId: string, file: { uri: string; name: string; mimeType: string }): Promise<void> {
    const form = new FormData();
    form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    form.append("request_kind", kind);
    form.append("request_id", requestId);
    await http.post("/api/request-attachments", form, { headers: { "Content-Type": "multipart/form-data" } });
  },

  async remove(id: string): Promise<void> {
    await http.delete(`/api/request-attachments/${encodeURIComponent(id)}`);
  },
};
