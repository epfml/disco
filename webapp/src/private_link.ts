import type { Task } from "@epfml/discojs";

/**
 * Link to share a private task.
 *
 * The token is in the fragment, which browsers never send to any server, so
 * that it stays out of their logs.
 */
export function privateTaskLink(id: Task.ID, token: string): URL {
  const link = new URL(`/${encodeURIComponent(id)}`, window.location.origin);
  link.hash = new URLSearchParams({ token }).toString();
  return link;
}

/** Token carried by the fragment of a private task's link, if any */
export function tokenFromHash(hash: string): string | undefined {
  return new URLSearchParams(hash.replace(/^#/, "")).get("token") ?? undefined;
}
