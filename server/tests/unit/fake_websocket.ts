import type {
  decentralizedMessages,
  federatedMessages,
  mtype,
} from "@epfml/discojs";
import * as msgpack from "@msgpack/msgpack";
import { EventEmitter } from "node:events";
import { vi } from "vitest";
import type WebSocket from "ws";

type AnyMessage = { type: mtype.MType };

// Type for the generic fake WebSocket that can send and receive messages of specific types
export type FakeWebSocket<
  Sent extends AnyMessage,
  Received extends AnyMessage,
> = WebSocket & {
  sentMessages: Sent[];
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

  ws.send = vi.fn((data: Buffer | Uint8Array) => {
    const decoded = msgpack.decode(data) as Sent;
    ws.sentMessages.push(decoded);
  }); // as unknown as WebSocket["send"]

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

/** Type for a message sent from the server to the client in the federated protocol */
type FederatedFromServer =
  | federatedMessages.NewFederatedNodeInfo
  | federatedMessages.ReceiveServerPayload
  | mtype.WaitingForMoreParticipants
  | mtype.EnoughParticipants
  | mtype.ParticipantsUpdate;

/** Type for a message sent from the client to the server in the federated protocol */
type FederatedToServer = mtype.ClientConnected | federatedMessages.SendPayload;

/** Type for a fake WebSocket that can send and receive messages of the federated protocol */
export type FederatedFakeWebSocket = FakeWebSocket<
  FederatedFromServer,
  FederatedToServer
>;

/** Create a fake WebSocket that can send and receive messages of the federated protocol */
export const makeFederatedFakeWebSocket = (): FederatedFakeWebSocket =>
  makeFakeWebSocket<FederatedFromServer, FederatedToServer>();
