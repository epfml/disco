import { SignalData } from 'simple-peer'

import { weights } from '../../serialization'

import { isNodeID, NodeID } from '../types'

import { type, ClientConnected, AssignNodeID, hasMessageType } from '../messages'

/// Phase 0 communication (between server and peers)

// WebRTC signal to forward to other node
export interface SignalForPeer {
  type: type.SignalForPeer
  peer: NodeID
  signal: SignalData
}

// client who sent is ready
export interface PeerIsReady {
  type: type.PeerIsReady
}

// server send to client who to connect to
export interface PeersForRound {
  type: type.PeersForRound
  peers: NodeID[]
}

/// Phase 1 communication (between peers)

export interface Payload {
  type: type.Payload
  peer: NodeID
  round: number
  payload: weights.Encoded
}

/// Phase 2 communication (between peers)

export type MessageFromServer =
  AssignNodeID |
  SignalForPeer |
  PeersForRound

export type MessageToServer =
  ClientConnected |
  SignalForPeer |
  PeerIsReady

export type PeerMessage = Payload

export function isMessageFromServer (o: unknown): o is MessageFromServer {
  if (!hasMessageType(o)) {
    return false
  }

  switch (o.type) {
    case type.AssignNodeID:
      return 'id' in o && isNodeID(o.id)
    case type.SignalForPeer:
      return 'peer' in o && isNodeID(o.peer) &&
        'signal' in o // TODO check signal content?
    case type.PeersForRound:
      return 'peers' in o && Array.isArray(o.peers) && o.peers.every(isNodeID)
  }

  return false
}

export function isMessageToServer (o: unknown): o is MessageToServer {
  if (!hasMessageType(o)) {
    return false
  }

  switch (o.type) {
    case type.ClientConnected:
      return true
    case type.SignalForPeer:
      return 'peer' in o && isNodeID(o.peer) &&
        'signal' in o // TODO check signal content?
    case type.PeerIsReady:
      return true
  }

  return false
}

export function isPeerMessage (o: unknown): o is PeerMessage {
  if (!hasMessageType(o)) {
    return false
  }

  switch (o.type) {
    case type.Payload:
      return (
        'peer' in o && isNodeID(o.peer) &&
        'payload' in o && weights.isEncoded(o.payload)
      )
  }

  return false
}
