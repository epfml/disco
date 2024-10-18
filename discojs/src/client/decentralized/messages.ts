import { serialization } from "../../index.js";

import { type SignalData } from './peer.js'
import { isNodeID, type NodeID } from '../types.js'
import { type, hasMessageType } from '../messages.js'
import type { ClientConnected, WaitingForMoreParticipants, EnoughParticipants } from '../messages.js'


/// Phase 0 communication (between server and peers)
export interface NewDecentralizedNodeInfo {
  type: type.NewDecentralizedNodeInfo
  id: NodeID
  waitForMoreParticipants: boolean
}

// WebRTC signal to forward to other node
export interface SignalForPeer {
  type: type.SignalForPeer
  peer: NodeID
  signal: SignalData
}

// peer wants to join the next round
export interface JoinRound {
  type: type.JoinRound
}

// peer who sent is ready
export interface PeerIsReady {
  type: type.PeerIsReady
}

// server sends to each peer the list of peers to connect to
export interface PeersForRound {
  type: type.PeersForRound
  peers: NodeID[]
  aggregationRound: number
}

/// Phase 1 communication (between peers)

export interface Payload {
  type: type.Payload
  peer: NodeID
  aggregationRound: number
  communicationRound: number
  payload: serialization.Encoded
}

/// Phase 2 communication (between peers)

export type MessageFromServer =
  NewDecentralizedNodeInfo |
  SignalForPeer |
  PeersForRound |
  WaitingForMoreParticipants |
  EnoughParticipants

export type MessageToServer =
  ClientConnected |
  SignalForPeer |
  PeerIsReady |
  JoinRound

export type PeerMessage = Payload

export function isMessageFromServer (o: unknown): o is MessageFromServer {
  if (!hasMessageType(o)) return false

  switch (o.type) {
    case type.NewDecentralizedNodeInfo:
      return 'id' in o && isNodeID(o.id) &&
        'waitForMoreParticipants' in o &&
        typeof o.waitForMoreParticipants === 'boolean'
    case type.SignalForPeer:
      return 'peer' in o && isNodeID(o.peer) &&
        'signal' in o // TODO check signal content?
    case type.PeersForRound:
      return 'peers' in o && Array.isArray(o.peers) && o.peers.every(isNodeID)
    case type.WaitingForMoreParticipants:
    case type.EnoughParticipants:
          return true
  }

  return false
}

export function isMessageToServer (o: unknown): o is MessageToServer {
  if (!hasMessageType(o)) return false

  switch (o.type) {
    case type.ClientConnected:
      return true
    case type.SignalForPeer:
      return 'peer' in o && isNodeID(o.peer) &&
        'signal' in o // TODO check signal content?
    case type.JoinRound:
    case type.PeerIsReady:
      return true
  }

  return false
}

export function isPeerMessage (o: unknown): o is PeerMessage {
  if (!hasMessageType(o)) return false

  switch (o.type) {
    case type.Payload:
      return (
        'peer' in o && isNodeID(o.peer) &&
        'payload' in o && serialization.isEncoded(o.payload)
      )
  }

  return false
}
