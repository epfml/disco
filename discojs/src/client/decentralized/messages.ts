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
  nbOfParticipants: number
  joinedMidTraining: boolean
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

// peer sends to server to signal all the connections to other peers
// are established
export interface ConnectionsReady {
  type: type.ConnectionsReady
}

// Server signals each peer to start weight update sharing
export interface StartWeightSharing {
  type: type.StartWeightSharing
}

// Server signals peers to reestablish peer connections
export interface RetryPeerConnections {
  type: type.RetryPeerConnections
}

// Server signals a node that the connection with other peers failed 
export interface ConnectionFail {
  type: type.ConnectionFail
}

// Nodes joining in the middle of the training send to server
// to request the latest model before starting local training
export interface ModelSyncRequest {
  type: type.ModelSyncRequest
}

// Server signals a node that shares the lastest model with node
// who joined in the middle of the training
export interface SignalNewPeer {
  type: type.SignalNewPeer
  newNode: NodeID 
}

// Server signals new node joining in the middle of the training
// about the model provider node
export interface SignalModelProvider {
  type: type.SignalModelProvider
  providerNode: NodeID 
}

// Sent by client to another client to share the latest model
export interface SharedModel {
  type: type.SharedModel
  model: serialization.Encoded
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
  EnoughParticipants |
  StartWeightSharing |
  RetryPeerConnections |
  ConnectionFail |
  SignalModelProvider |
  SignalNewPeer

export type MessageToServer =
  ClientConnected |
  SignalForPeer |
  PeerIsReady |
  JoinRound |
  ConnectionsReady |
  ModelSyncRequest

export type PeerMessage = 
  Payload |
  SharedModel

export function isMessageFromServer (o: unknown): o is MessageFromServer {
  if (!hasMessageType(o)) return false

  switch (o.type) {
    case type.NewDecentralizedNodeInfo:
      return 'id' in o && isNodeID(o.id) &&
        'waitForMoreParticipants' in o &&
        typeof o.waitForMoreParticipants === 'boolean'
    case type.SignalForPeer:
      return 'peer' in o && isNodeID(o.peer) &&
        'signal' in o
    case type.PeersForRound:
      return 'peers' in o && Array.isArray(o.peers) && o.peers.every(isNodeID)
    case type.WaitingForMoreParticipants:
    case type.EnoughParticipants:
    case type.StartWeightSharing:
    case type.RetryPeerConnections:
    case type.ConnectionFail:
    case type.SignalModelProvider:
    case type.SignalNewPeer:
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
        'signal' in o
    case type.JoinRound:
    case type.PeerIsReady:
    case type.ConnectionsReady:
    case type.ModelSyncRequest:
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
    case type.SharedModel:
      return (
        'model' in o && serialization.isEncoded(o.model)
      )
  }

  return false
}
