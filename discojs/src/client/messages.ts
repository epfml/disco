import type * as decentralized from './decentralized/messages.js'
import type * as federated from './federated/messages.js'
import { type NodeID } from './types.js'

export enum type {
  ClientConnected,
  AssignNodeID,

  // Decentralized
  SignalForPeer,

  PeerIsReady,
  PeersForRound,

  Payload,

  // Federated
  SendPayload,
  ReceiveServerMetadata,
  ReceiveServerPayload,
  RequestServerStatistics,
  ReceiveServerStatistics,
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
