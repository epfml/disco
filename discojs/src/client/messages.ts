import type * as decentralized from './decentralized/messages.js'
import type * as federated from './federated/messages.js'
import { type NodeID } from './types.js'

export enum type {
  // Sent from client to server as first point of contact to join a task. 
  // The server answers with an node id in a AssignNodeID message
  ClientConnected,  
  // When a user joins a task with a ClientConnected message, the server
  // answers with an AssignNodeID message with its peer id.
  AssignNodeID,

  /* Decentralized */
  // Message forwarded by the server from a client to another client
  // to establish a peer-to-peer (WebRTC) connection
  SignalForPeer,
  PeerIsReady,
  PeersForRound,
  Payload,

  // Federated
  SendPayload,
  ReceiveServerMetadata,
  ReceiveServerPayload,
}

export interface ClientConnected {
  type: type.ClientConnected
}

export interface AssignNodeID {
  type: type.AssignNodeID
  id: NodeID
}

export type Message =
  decentralized.MessageFromServer |
  decentralized.MessageToServer |
  decentralized.PeerMessage |
  federated.MessageFederated

// Retrieve a specific message interface from the type D. i.e. NarrowMessage<messages.type.PeerId> => messages.PeerId type
export type NarrowMessage<D> = Extract<Message, { type: D }>

export function hasMessageType (raw: unknown): raw is { type: type } & Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const o = raw as Record<string, unknown>
  if (
    !('type' in o && typeof o.type === 'number' && o.type in type)
  ) {
    return false
  }

  return true
}
