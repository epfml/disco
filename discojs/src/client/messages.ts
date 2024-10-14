import type * as decentralized from './decentralized/messages.js'
import type * as federated from './federated/messages.js'

export enum type {
  // Sent from client to server as first point of contact to join a task. 
  // The server answers with an node id in a NewFederatedNodeInfo
  // or NewDecentralizedNodeInfo message
  ClientConnected,  
  
  /* Decentralized */
  // When a user joins a task with a ClientConnected message, the server
  // answers with  its peer id and also tells the client whether we are waiting
  // for more participants before starting training
  NewDecentralizedNodeInfo,
  // Message sent by peers to the server to signal they want to 
  // join the next round
  JoinRound,
  // Message sent by nodes to server signaling they are ready to 
  // start the next round
  PeerIsReady,
  // Sent by the server to participating peers containing the list
  // of peers for the round
  PeersForRound,
  // Message forwarded by the server from a client to another client
  // to establish a peer-to-peer (WebRTC) connection
  SignalForPeer,
  // The weight update
  Payload,
  
  /* Federated */
  // The server answers the ClientConnected message with the necessary information
  // to start training: node id, latest model global weights, current round etc
  NewFederatedNodeInfo,
  // Message sent by server to notify clients that there are not enough
  // participants to continue training
  WaitingForMoreParticipants,
  // Message sent by server to notify clients that there are now enough
  // participants to start training collaboratively
  EnoughParticipants,
  SendPayload,
  ReceiveServerPayload,
}

export interface ClientConnected {
  type: type.ClientConnected
}

export interface EnoughParticipants {
  type: type.EnoughParticipants
}

export interface WaitingForMoreParticipants {
  type: type.WaitingForMoreParticipants
}

export type Message =
  decentralized.MessageFromServer |
  decentralized.MessageToServer |
  decentralized.PeerMessage |
  federated.MessageFederated

// Retrieve a specific message interface from the type D. i.e. NarrowMessage<messages.type.PeerId> => messages.PeerId type
export type NarrowMessage<D> = Extract<Message, { type: D }>

export function hasMessageType (raw: unknown): raw is { type: type } & Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) return false

  const o = raw as Record<string, unknown>
  if (
    !('type' in o && typeof o.type === 'number' && o.type in type)
  ) {
    return false
  }

  return true
}
