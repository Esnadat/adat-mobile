/**
 * Client-generated idempotency key for sensitive write requests.
 *
 * The same key must be reused across retries of a single logical submission so
 * the BFF (which dedupes by key within a short window) collapses a network-lost
 * retry into the original result instead of creating a duplicate record. Generate
 * one per submission attempt, reuse it while retrying, and drop it on success.
 */
export function newIdempotencyKey(): string {
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}-${rand()}-${rand()}`;
}

/** Header name the BFF idempotency middleware reads. */
export const IDEMPOTENCY_HEADER = "Idempotency-Key";
