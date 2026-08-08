import type * as decentralized from "#client/decentralized/messages";
import type * as federated from "#client/federated/messages";

export type Message =
  | decentralized.MessageFromServer
  | decentralized.MessageToServer
  | decentralized.PeerMessage
  | federated.MessageFederated;

// Retrieve a specific message interface from the type D. i.e. NarrowMessage<messages.type.PeerId> => messages.PeerId type
export type NarrowMessage<D> = Extract<Message, { type: D }>;
