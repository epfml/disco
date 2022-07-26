import { weights } from './serialization'

export type PeerID = number
export type EncodedSignal = Uint8Array

export enum messageType {
  // Phase 0 communication (just between server and client)
  serverClientIDMessage,
  clientReadyMessage,
  serverReadyClients,
  // Phase 1 communication (between client and peers)
  clientWeightsMessageServer,
  clientSharesMessageServer,
  // Phase 2 communication (between client and peers)
  clientPartialSumsMessageServer
}

export interface serverClientIDMessage {type: messageType, peerID: PeerID} // server sends client id to client
export interface clientReadyMessage {type: messageType, round: number} // client who sent is ready
export interface clientWeightsMessageServer {type: messageType, peerID: PeerID, weights: weights.Encoded, destination: PeerID} // client weights
export interface clientSharesMessageServer {type: messageType, peerID: PeerID, weights: weights.Encoded, destination: PeerID} // client weights
export interface clientPartialSumsMessageServer {type: messageType, peerID: PeerID, partials: weights.Encoded, destination: PeerID} // client partial sum
export interface serverReadyClients {type: messageType, peerList: PeerID[]} // server send to client who to connect to
