import { weights } from '../../serialization'

import { isPeerID, PeerID as PeerIDType } from './types'

export enum type {
  clientConnected,

  PeerID,
  PeerIsReady,
  PeersForRound,

  Weights,
  Shares,

  PartialSums
}

export interface clientConnectedMessage {
  type: type.clientConnected
}

/// Phase 0 communication (just between server and client)

// server sends client id to client
export interface PeerID {
  type: type.PeerID
  id: PeerIDType
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
  clientConnectedMessage |
  PeerID |
  PeersForRound

export type MessageToServer =
  PeerIsReady

export type PeerMessage =
  Weights |
  Shares |
  PartialSums

function hasMessageType (raw: unknown): raw is {type: type} & Record<string, unknown> {
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

export function isMessageFromServer (o: unknown): o is MessageFromServer {
  if (!hasMessageType(o)) {
    return false
  }

  switch (o.type) {
    case type.clientConnected:
      return true
    case type.PeerID:
      return 'id' in o && isPeerID(o.id)
    case type.PeersForRound:
      return 'peers' in o && Array.isArray(o.peers) && o.peers.every(isPeerID)
  }

  return false
}

export function isMessageToServer (o: unknown): o is MessageToServer {
  if (!hasMessageType(o)) {
    return false
  }

  return o.type === type.PeerIsReady
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
