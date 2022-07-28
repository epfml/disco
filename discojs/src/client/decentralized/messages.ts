import { TaskID } from '@/task'
import { weights } from '../../serialization'
import { PeerID } from './types'

export enum type {
  clientConnected,

  serverClientIDMessage,
  clientReadyMessage,
  serverReadyClients,

  clientWeightsMessageServer,
  clientSharesMessageServer,

  clientPartialSumsMessageServer
}

export interface clientConnectedMessage {
  type: type.clientConnected
}

/// Phase 0 communication (just between server and client)

// server sends client id to client
export interface serverClientIDMessage {
  type: type.serverClientIDMessage
  peerID: PeerID
}

// client who sent is ready
export interface clientReadyMessage {
  type: type.clientReadyMessage
  round: number
  peerID: PeerID
  task: TaskID
}

// server send to client who to connect to
export interface serverReadyClients {
  type: type.serverReadyClients
  peerList: PeerID[]
}

/// Phase 1 communication (between client and peers)

// client weights
export interface clientWeightsMessageServer {
  type: type.clientWeightsMessageServer
  peerID: PeerID
  weights: weights.Encoded
  destination: PeerID
}

// client shares
export interface clientSharesMessageServer {
  type: type.clientSharesMessageServer
  peerID: PeerID
  weights: weights.Encoded
  destination: PeerID
}

/// Phase 2 communication (between client and peers)

// client partial sum
export interface clientPartialSumsMessageServer {
  type: type.clientPartialSumsMessageServer
  peerID: PeerID
  partials: weights.Encoded
  destination: PeerID
}

export type ServerMessage =
  clientConnectedMessage |
  serverClientIDMessage |
  serverReadyClients

export type PeerMessage =
  clientReadyMessage |
  clientWeightsMessageServer |
  clientSharesMessageServer |
  clientPartialSumsMessageServer

export type Message = ServerMessage | PeerMessage
