/**
 * Error thrown when the server reports a fatal error affecting the client.
 */
export class ClientCrashError extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.reason = reason;
    this.name = "ClientCrashError";
  }
}
