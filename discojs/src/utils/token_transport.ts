/**
 * Throws unless what is sent to the URL is encrypted, so that the token of a
 * private task never travels in cleartext
 * Plain HTTP and WebSocket is allowed for local development and tests.
 */
export function assertCanSendToken(url: URL): void {
  if (url.protocol === "https:" || url.protocol === "wss:") return;
  if (isLoopback(url.hostname)) return;

  throw new Error(
    `refusing to send a private task's token to ${url.origin} without TLS, use https`,
  );
}

function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    // URL normalizes IPv4 addresses, so this catches "127.1" too
    /^127\.\d+\.\d+\.\d+$/.test(hostname)
  );
}
