import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppNotification } from "../services/notificationsService";

/**
 * Client-side read-state for notifications. The BFF returns computed (not stored)
 * notifications, so "read" is tracked locally by id. When a persistent backend
 * notification model exists, this can be swapped for a server call without changing
 * the screens (they consume `AppNotification.read`).
 */
const KEY = "notif_read_ids_v1";

async function getReadSet(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as unknown) : [];
    return new Set(Array.isArray(arr) ? arr.map((x) => String(x)) : []);
  } catch {
    return new Set();
  }
}

async function persist(set: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

export async function applyReadState(items: AppNotification[]): Promise<AppNotification[]> {
  const read = await getReadSet();
  return items.map((n) => ({ ...n, read: read.has(n.id) }));
}

export async function markRead(id: string): Promise<void> {
  const set = await getReadSet();
  set.add(id);
  await persist(set);
}

export async function markAllRead(ids: string[]): Promise<void> {
  const set = await getReadSet();
  for (const id of ids) set.add(id);
  await persist(set);
}

/** Count of unread notifications for the badge. */
export function unreadCount(items: AppNotification[]): number {
  return items.reduce((n, x) => (x.read ? n : n + 1), 0);
}
