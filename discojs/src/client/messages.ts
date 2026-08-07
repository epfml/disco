import type * as decentralized from "./decentralized/messages.js";
import type * as federated from "./federated/messages.js";

export type Message =
  | decentralized.MessageFromServer
  | decentralized.MessageToServer
  | decentralized.PeerMessage
  | federated.MessageFederated;

// Retrieve a specific message interface from the type D. i.e. NarrowMessage<messages.type.PeerId> => messages.PeerId type
export type NarrowMessage<D> = Extract<Message, { type: D }>;
