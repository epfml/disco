import type {
  decentralizedMessages,
  federatedMessages,
  mtype,
} from "@epfml/discojs";
import * as msgpack from "@msgpack/msgpack";
import { EventEmitter } from "node:events";
import { assert, vi } from "vitest";
import type WebSocket from "ws";

type AnyMessage = { type: mtype.MType };

// Type for the generic fake WebSocket that can send and receive messages of specific types
export type FakeWebSocket<
  Sent extends AnyMessage,
  Received extends AnyMessage,
> = WebSocket & {
  sentMessages: Sent[];
  /** Number of times the server forcefully closed the connection */
  nbOfTerminations: number;
  emitMessage: (message: Received) => void;
  emitClose: () => void;
};

/** Create a fake WebSocket */
function makeFakeWebSocket<
  Sent extends AnyMessage,
  Received extends AnyMessage,
>(): FakeWebSocket<Sent, Received> {
  const ws = new EventEmitter() as FakeWebSocket<Sent, Received>;

  ws.sentMessages = [];

  ws.send = vi.fn((data: Buffer | Uint8Array, ...args: unknown[]) => {
    const decoded = msgpack.decode(data) as Sent;
    ws.sentMessages.push(decoded);
    // asynchronously tells when the message is sent,
    // the callback following the options if any
    const callback = args.find((arg) => typeof arg === "function");
    if (callback !== undefined) process.nextTick(callback);
  }) as WebSocket["send"];

  // asynchronously emits "close" once the connection is destroyed
  ws.nbOfTerminations = 0;
  ws.terminate = () => {
    if (ws.nbOfTerminations++ === 0) process.nextTick(() => ws.emitClose());
  };

  ws.emitMessage = (message: Received) => {
    ws.emit("message", msgpack.encode(message));
  };

  ws.emitClose = () => {
    ws.emit("close");
  };

  return ws;
}

/** Get the last message of a specific type sent by the fake WebSocket */
export function lastMessageOfType<
  Sent extends AnyMessage,
  Received extends AnyMessage,
  T extends Sent["type"],
>(
  ws: FakeWebSocket<Sent, Received>,
  type: T,
): Extract<Sent, { type: T }> | undefined {
  return messagesOfType(ws, type).at(-1);
}

/**
 * Get the last message of a specific type sent by the fake WebSocket,
 * failing the test if no such message was sent.
 *
 * Contrary to `lastMessageOfType`, the returned message is never undefined,
 * which spares callers a non-null assertion on every field they check.
 */
export function expectLastMessageOfType<
  Sent extends AnyMessage,
  Received extends AnyMessage,
  T extends Sent["type"],
>(ws: FakeWebSocket<Sent, Received>, type: T): Extract<Sent, { type: T }> {
  const message = lastMessageOfType(ws, type);
  assert.exists(message, `no message of type ${String(type)} was sent`);
  return message;
}

/** Get all messages of a specific type sent by the fake WebSocket */
export function messagesOfType<
  Sent extends AnyMessage,
  Received extends AnyMessage,
  T extends Sent["type"],
>(ws: FakeWebSocket<Sent, Received>, type: T): Extract<Sent, { type: T }>[] {
  return ws.sentMessages.filter(
    (message): message is Extract<Sent, { type: T }> => message.type === type,
  );
}

/** Type for a fake WebSocket that can send and receive messages of the decentralized protocol */
export type DecentralizedFakeWebSocket = FakeWebSocket<
  decentralizedMessages.MessageFromServer,
  decentralizedMessages.MessageToServer
>;

/** Create a fake WebSocket that can send and receive messages of the decentralized protocol */
export const makeDecentralizedFakeWebSocket = (): DecentralizedFakeWebSocket =>
  makeFakeWebSocket<
    decentralizedMessages.MessageFromServer,
    decentralizedMessages.MessageToServer
  >();

/** Type for a fake WebSocket that can send and receive messages of the federated protocol */
export type FederatedFakeWebSocket = FakeWebSocket<
  federatedMessages.MessageFromServer,
  federatedMessages.MessageToServer
>;

/** Create a fake WebSocket that can send and receive messages of the federated protocol */
export const makeFederatedFakeWebSocket = (): FederatedFakeWebSocket =>
  makeFakeWebSocket<
    federatedMessages.MessageFromServer,
    federatedMessages.MessageToServer
  >();
