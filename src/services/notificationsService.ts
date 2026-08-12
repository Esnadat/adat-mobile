import type { AxiosResponse } from "axios";
import { http } from "./http";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  description: string;
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
        } as AppNotification;
      })
      .filter((x): x is AppNotification => x !== null);
  },
};
