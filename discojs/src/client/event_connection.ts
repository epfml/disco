import createDebug from "debug";
import WebSocket from "@epfml/isomorphic-ws";
import * as msgpack from "@msgpack/msgpack";
import type { SignalData } from "#client/decentralized/peer";
import { Peer } from "#client/decentralized/peer";
import type { NodeID } from "#client/types";
import * as decentralizedMessages from "#client/decentralized/messages";
import { MType } from "#client/mtype";
import { type NarrowMessage, type Message } from "#client/messages";
import { abortable, timeout } from "#client/utils";
import { shortenId } from "#client/utils";

import { EventEmitter } from "#utils/event_emitter";

const debug = createDebug("discojs:client:connections");

/**
 * Only the Node.js WebSocket provides detailed error messages.
 * This function extracts it if available.
 * @param event The error event from the WebSocket
 * @returns A string describing the error, if available, or "unknown error" otherwise.
 */
function describeError(event: Event): string {
  return "message" in event ? String(event.message) : "unknown error";
}

export interface EventConnection {
  on: <K extends MType>(
    type: K,
    handler: (event: NarrowMessage<K>) => void,
  ) => void;
  once: <K extends MType>(
    type: K,
    handler: (event: NarrowMessage<K>) => void,
  ) => void;
  send: <T extends Message>(msg: T) => void;
  disconnect: () => Promise<void>;
}

/**
 * Waits for a specific type of message from the event connection.
 * This function will resolve once a message of the specified type is received,
 * or reject if the abort signal is triggered.
 * @param connection The event connection to listen on
 * @param type The type of message to wait for
 * @param signal An optional AbortSignal to control the abortion
 * @returns A promise that resolves with the received message of the specified type
 */
export async function waitMessage<T extends MType>(
  connection: EventConnection,
  type: T,
  signal?: AbortSignal,
): Promise<NarrowMessage<T>> {
  return await abortable(
    new Promise((resolve) => {
      // "once" is important because we can't resolve the same promise multiple times
      connection.once(type, (event) => {
        resolve(event);
      });
    }),
    signal,
  );
}

export async function waitMessageWithTimeout<T extends MType>(
  connection: EventConnection,
  type: T,
  timeoutMs?: number,
  errorMsg: string = "timeout",
): Promise<NarrowMessage<T>> {
  return await Promise.race([
    waitMessage(connection, type),
    timeout(timeoutMs, errorMsg),
  ]);
}

/**
 * Send message and wait for a specific response,
 * resending until a response or until timeout.
 * The global timeout is `retryDelayMs * maxAttempts`.
 * @param retryDelayMs - Delay between retry attempts in milliseconds (default: 60_000)
 * @param maxAttempts - Maximum number of retry attempts (default: 3)
 * @param signal An optional AbortSignal to control the abortion of the wait for the response
 */
export async function sendAndWaitWithRetry<T extends MType>(
  connection: EventConnection,
  request: Message,
  responseType: T,
  {
    retryDelayMs = 60_000,
    maxAttempts = 3,
    signal,
  }: { retryDelayMs?: number; maxAttempts?: number; signal?: AbortSignal } = {},
): Promise<NarrowMessage<T>> {
  // Create the response promise before sending the request
  // to avoid missing the response
  const response = waitMessage(connection, responseType, signal);
  const RETRY = Symbol("retry"); // Symbol used to indicate a retry attempt

  let timer: ReturnType<typeof setTimeout> | undefined; // Register the timer once
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      connection.send(request);

      const received = await Promise.race([
        response,
        new Promise<typeof RETRY>((resolve) => {
          timer = setTimeout(() => resolve(RETRY), retryDelayMs);
        }),
      ]);
      clearTimeout(timer); // Clear the timer after each attempt

      if (received !== RETRY) return received; // Return the received message if it's not a retry signal

      debug(
        "no %o after %dms, re-sending %o (%d/%d)",
        responseType,
        retryDelayMs,
        request.type,
        attempt,
        maxAttempts,
      );
    }
  } finally {
    clearTimeout(timer);
  }

  throw new Error(
    `no ${responseType} received after ${maxAttempts} ${request.type}`,
  );
}

export class PeerConnection
  extends EventEmitter<{ [K in MType]: NarrowMessage<K> }>
  implements EventConnection
{
  readonly #isConnectedPromise: Promise<void>;
  readonly #peer: Peer;

  constructor(
    private readonly _ownId: NodeID,
    otherId: NodeID,
    signallingServer: EventConnection,
  ) {
    super();
    this.#peer = new Peer(otherId, this._ownId < otherId);
    // creating Peer immediately emit a "signal" event
    this.#peer.on("signal", (signal) => {
      const msg: decentralizedMessages.SignalForPeer = {
        type: MType.SignalForPeer,
        peer: otherId,
        signal,
      };
      debug(
        `[${shortenId(this._ownId)}] sent a SignalForPeer ${otherId} to the server`,
      );
      signallingServer.send(msg);
    });

    this.#peer.on("data", (data) => {
      const msg: unknown = msgpack.decode(data);

      if (!decentralizedMessages.isPeerMessage(msg)) {
        throw new Error(`invalid message received: ${JSON.stringify(msg)}`);
      }

      this.emit(msg.type, msg);
    });

    // Init a promise that is resolved when the connection is established
    this.#isConnectedPromise = new Promise<void>((resolve) => {
      this.#peer.on("connect", () => resolve());
    });

    this.#peer.on("close", () => {
      debug(`[${shortenId(this._ownId)}] peer ${otherId} closed connection`);
    });

    this.#peer.on("error", (err: Error) => {
      debug(`[${shortenId(this._ownId)}] errored with error ${err}`);
    });
  }

  // Resolves when the connection is established
  async connect(): Promise<void> {
    await this.#isConnectedPromise;
  }

  signal(signal: SignalData): void {
    this.#peer.signal(signal);
  }

  send<T extends Message>(msg: T): void {
    if (!decentralizedMessages.isPeerMessage(msg)) {
      throw new Error(
        `can't send this type of message: ${JSON.stringify(msg)}`,
      );
    }
    this.#peer.send(Buffer.from(msgpack.encode(msg)));
  }

  async disconnect(): Promise<void> {
    await this.#peer.destroy();
  }
}

export class WebSocketServer
  extends EventEmitter<{ [K in MType]: NarrowMessage<K> }>
  implements EventConnection
{
  private constructor(
    private readonly socket: WebSocket,
    private readonly validateSent?: (msg: Message) => boolean,
  ) {
    super();
  }

  static async connect(
    url: URL,
    validateReceived: (msg: unknown) => msg is Message,
    validateSent: (msg: Message) => boolean,
  ): Promise<WebSocketServer> {
    const ws = new WebSocket(url);
    ws.binaryType = "arraybuffer";

    const server: WebSocketServer = new WebSocketServer(ws, validateSent);

    ws.onmessage = (event) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error("server did not send an ArrayBuffer");
      }

      const msg: unknown = msgpack.decode(new Uint8Array(event.data));

      // Validate message format
      if (!validateReceived(msg)) {
        throw new Error(`invalid message received: ${JSON.stringify(msg)}`);
      }

      server.emit(msg.type, msg);
    };

    ws.onclose = (event) => {
      debug(
        "websocket closed: code=%o reason=%o wasClean=%o",
        event.code,
        event.reason,
        event.wasClean,
      );
    };

    return await new Promise((resolve, reject) => {
      ws.onerror = (event) => {
        const error = describeError(event);
        debug("websocket error while connecting/receiving: %o", error);
        reject(new Error(`Server unreachable: ${error}`));
      };
      ws.onopen = () => {
        resolve(server);
      };
    });
  }

  disconnect(): Promise<void> {
    // the server may have closed the connection already, such as when it
    // crashes the client
    if (this.socket.readyState === WebSocket.CLOSED) return Promise.resolve();

    return new Promise((resolve, reject) => {
      this.socket.onclose = () => resolve();
      this.socket.onerror = (event) => reject(new Error(describeError(event)));
      this.socket.close();
    });
  }

  send(msg: Message): void {
    if (this.validateSent !== undefined && !this.validateSent(msg)) {
      throw new Error(
        `can't send this type of message: ${JSON.stringify(msg)}`,
      );
    }

    this.socket.send(msgpack.encode(msg));
  }
}
