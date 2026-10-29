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

/**
 * Error thrown by the operations of a client that disconnected meanwhile.
 */
export class ClientDisconnectedError extends Error {
  constructor() {
    super("client disconnected");
    this.name = "ClientDisconnectedError";
  }
}
