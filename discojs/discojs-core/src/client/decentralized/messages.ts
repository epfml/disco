import { SignalData } from 'simple-peer'

import { weights } from '../../serialization'

import { isPeerID, PeerID as PeerIDType } from './types'

import { type, clientConnected, hasMessageType } from '../messages'

/// Phase 0 communication (just between server and client)

// server sends client id to client
export interface PeerID {
  type: type.PeerID
  id: PeerIDType
}

// WebRTC signal to forward to peer
export interface SignalForPeer {
  type: type.SignalForPeer
  peer: PeerIDType
  signal: SignalData
}

// client who sent is ready
export interface PeerIsReady {
  type: type.PeerIsReady
}

// server send to client who to connect to
export interface PeersForRound {
  type: type.PeersForRound
  peers: PeerIDType[]
}

/// Phase 1 communication (between client and peers)

// client weights
export interface Weights {
  type: type.Weights
  peer: PeerIDType
  weights: weights.Encoded
}

// client shares
export interface Shares {
  type: type.Shares
  peer: PeerIDType
  weights: weights.Encoded
}

/// Phase 2 communication (between client and peers)

// client partial sum
export interface PartialSums {
  type: type.PartialSums
  peer: PeerIDType
  partials: weights.Encoded
}

export type MessageFromServer =
  PeerID |
  SignalForPeer |
  PeersForRound

export type MessageToServer =
  clientConnected |
  SignalForPeer |
  PeerIsReady

export type PeerMessage =
  Weights |
  Shares |
  PartialSums

export function isMessageFromServer (o: unknown): o is MessageFromServer {
  if (!hasMessageType(o)) {
    return false
  }

  switch (o.type) {
    case type.PeerID:
      return 'id' in o && isPeerID(o.id)
    case type.SignalForPeer:
      return 'peer' in o && isPeerID(o.peer) &&
        'signal' in o // TODO check signal content?
    case type.PeersForRound:
      return 'peers' in o && Array.isArray(o.peers) && o.peers.every(isPeerID)
  }

  return false
}

export function isMessageToServer (o: unknown): o is MessageToServer {
  if (!hasMessageType(o)) {
    return false
  }

  switch (o.type) {
    case type.clientConnected:
      return true
    case type.SignalForPeer:
      return 'peer' in o && isPeerID(o.peer) &&
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
    case type.Weights:
    case type.Shares:
      return 'peer' in o && isPeerID(o.peer) &&
        'weights' in o && weights.isEncoded(o.weights)
    case type.PartialSums:
      return 'peer' in o && isPeerID(o.peer) &&
        'partials' in o && weights.isEncoded(o.partials)
  }

  return false
}
