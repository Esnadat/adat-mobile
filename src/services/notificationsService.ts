import type { AxiosResponse } from "axios";
import { http } from "./http";

/**
 * Unified notification model. `read` is currently derived on the client (see
 * utils/notificationReads) because the BFF notifications are computed each request
 * rather than stored; the shape already carries `href`/`createdAt`/`read` so a future
 * persistent, push-capable backend can populate them without a client rewrite.
 * Tenant/employee scoping is implicit — the endpoint is session-scoped.
 */
export interface AppNotification {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string | null;
  createdAt: string | null;
  read: boolean;
}

export const notificationsService = {
  async getNotifications(): Promise<AppNotification[]> {
    const res: AxiosResponse<unknown> = await http.get("/api/notifications");
    const body = res.data as { items?: unknown } | undefined;
    const items = Array.isArray(body?.items) ? (body!.items as Record<string, unknown>[]) : [];
    return items
      .map((n, i) => {
        const title = n.title == null ? "" : String(n.title).trim();
        if (!title) return null;
        return {
          id: n.id == null ? `n-${i}` : String(n.id),
          type: n.type == null ? "info" : String(n.type),
          title,
          description: n.description == null ? "" : String(n.description).trim(),
          href: n.href == null ? null : String(n.href).trim() || null,
          createdAt: n.createdAt == null ? null : String(n.createdAt),
          read: false,
        } as AppNotification;
      })
      .filter((x): x is AppNotification => x !== null);
  },
};
