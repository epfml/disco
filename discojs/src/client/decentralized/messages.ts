import { TaskID } from '@/task'
import { weights } from '../../serialization'
import { PeerID } from './types'

export enum messageType {
  clientConnected,

  serverClientIDMessage,
  clientReadyMessage,
  serverReadyClients,

  clientWeightsMessageServer,
  clientSharesMessageServer,

  clientPartialSumsMessageServer
}

export interface clientConnectedMessage {
  type: messageType.clientConnected
}

/// Phase 0 communication (just between server and client)

// server sends client id to client
export interface serverClientIDMessage {
  type: messageType.serverClientIDMessage
  peerID: PeerID
}

// client who sent is ready
export interface clientReadyMessage {
  type: messageType.clientReadyMessage
  round: number
  peerID: PeerID
  task: TaskID
}

// server send to client who to connect to
export interface serverReadyClients {
  type: messageType.serverReadyClients
  peerList: PeerID[]
}

/// Phase 1 communication (between client and peers)

// client weights
export interface clientWeightsMessageServer {
  type: messageType.clientWeightsMessageServer
  peerID: PeerID
  weights: weights.Encoded
  destination: PeerID
}

// client shares
export interface clientSharesMessageServer {
  type: messageType.clientSharesMessageServer
  peerID: PeerID
  weights: weights.Encoded
  destination: PeerID
}

/// Phase 2 communication (between client and peers)

// client partial sum
export interface clientPartialSumsMessageServer {
  type: messageType.clientPartialSumsMessageServer
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
