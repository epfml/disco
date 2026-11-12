import {
  EventEmitter,
  Peer,
  type NodeID,
  type PeerEvents,
  type PeerFactory,
  type PeerTransport,
  type SignalData,
} from "@epfml/discojs";

// Connection IDs identify a transport instance, not a participant: retries may
// replace a connection to the same participant while old events are in flight.
type Command =
  | { type: "create"; connection: number; peer: NodeID; initiator: boolean }
  | { type: "signal"; connection: number; signal: SignalData }
  | { type: "send"; connection: number; data: Uint8Array }
  | { type: "drain"; connection: number; request: number; timeout?: number }
  | { type: "destroy"; connection: number };

type Reply =
  | { type: "connect" | "close"; connection: number }
  | { type: "signal"; connection: number; signal: SignalData }
  | { type: "data"; connection: number; data: Uint8Array }
  | { type: "error"; connection: number; message: string }
  | { type: "drained"; connection: number; request: number };

/** Runs on the page. It handles opaque bytes, never models or training rounds. */
export function servePeerTransport(
  port: MessagePort,
  createPeer: PeerFactory = (id, initiator) => new Peer(id, initiator),
): () => void {
  const peers = new Map<number, PeerTransport>();
  let closed = false;
  const reply = (message: Reply) => {
    if (closed) return;
    if (message.type === "data") {
      // A Buffer may share a pooled backing store. Transfer only our own copy.
      const data = Uint8Array.from(message.data);
      port.postMessage({ ...message, data }, [data.buffer]);
    } else port.postMessage(message);
  };
  const fail = (connection: number, error: unknown) =>
    reply({
      type: "error",
      connection,
      message: error instanceof Error ? error.message : String(error),
    });

  port.onmessage = ({ data: command }: MessageEvent<Command>) => {
    if (closed) return;
    const connection = command.connection;
    try {
      if (command.type === "create") {
        const peer = createPeer(command.peer, command.initiator);
        peers.set(connection, peer);
        peer.on("connect", () => reply({ type: "connect", connection }));
        peer.on("close", () => {
          peers.delete(connection);
          reply({ type: "close", connection });
        });
        peer.on("signal", (signal) =>
          reply({ type: "signal", connection, signal }),
        );
        peer.on("data", (data) => reply({ type: "data", connection, data }));
        peer.on("error", (error) => fail(connection, error));
        return;
      }
      const peer = peers.get(connection);
      if (peer === undefined) {
        if (command.type === "drain")
          reply({ type: "drained", connection, request: command.request });
        return;
      }
      switch (command.type) {
        case "signal":
          peer.signal(command.signal);
          break;
        case "send":
          peer.send(command.data);
          break;
        case "drain":
          void peer
            .drain(command.timeout)
            .catch((error: unknown) => fail(connection, error))
            .finally(() =>
              reply({ type: "drained", connection, request: command.request }),
            );
          break;
        case "destroy":
          peers.delete(connection);
          void peer
            .destroy()
            .catch((error: unknown) => fail(connection, error));
          break;
      }
    } catch (error) {
      fail(connection, error);
    }
  };
  return () => {
    closed = true;
    port.close();
    for (const peer of peers.values())
      void peer.destroy().catch(() => undefined);
    peers.clear();
  };
}

/** Runs in the worker, exposing the same peer API as the native transport. */
export function workerPeerFactory(port: MessagePort): PeerFactory {
  const peers = new Map<number, RemotePeer>();
  let nextConnection = 0;
  port.onmessage = ({ data }: MessageEvent<Reply>) =>
    peers.get(data.connection)?.receive(data);

  class RemotePeer extends EventEmitter<PeerEvents> implements PeerTransport {
    private destroyed = false;
    private nextRequest = 0;
    private readonly drains = new Map<number, () => void>();
    constructor(private readonly connection: number) {
      super();
    }
    private post(command: Command): void {
      if (this.destroyed) return;
      if (command.type === "send") {
        // Callers retain ownership of their input, just as with Peer.send().
        const data = Uint8Array.from(command.data);
        port.postMessage({ ...command, data }, [data.buffer]);
      } else port.postMessage(command);
    }
    signal(signal: SignalData): void {
      this.post({ type: "signal", connection: this.connection, signal });
    }
    send(data: Uint8Array): void {
      this.post({ type: "send", connection: this.connection, data });
    }
    async drain(timeout?: number): Promise<void> {
      if (this.destroyed) return;
      const request = this.nextRequest++;
      const done = new Promise<void>((resolve) =>
        this.drains.set(request, resolve),
      );
      this.post({
        type: "drain",
        connection: this.connection,
        request,
        timeout,
      });
      await done;
    }
    destroy(): Promise<void> {
      if (!this.destroyed) {
        this.post({ type: "destroy", connection: this.connection });
        this.close();
      }
      return Promise.resolve();
    }
    private close(): void {
      this.destroyed = true;
      peers.delete(this.connection);
      for (const resolve of this.drains.values()) resolve();
      this.drains.clear();
      this.emit("close", undefined);
    }
    receive(message: Reply): void {
      switch (message.type) {
        case "connect":
          this.emit("connect", undefined);
          break;
        case "close":
          this.close();
          break;
        case "signal":
          this.emit("signal", message.signal);
          break;
        case "data":
          this.emit("data", message.data);
          break;
        case "error":
          this.emit("error", new Error(message.message));
          break;
        case "drained":
          this.drains.get(message.request)?.();
          this.drains.delete(message.request);
          break;
      }
    }
  }
  return (peer, initiator) => {
    const connection = nextConnection++;
    const remote = new RemotePeer(connection);
    peers.set(connection, remote);
    port.postMessage({
      type: "create",
      connection,
      peer,
      initiator,
    } satisfies Command);
    return remote;
  };
}
