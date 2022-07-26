import { List } from 'immutable'
import { weights } from './serialization'

export type PeerID = number
export type EncodedSignal = Uint8Array

export enum messageType {
  serverClientIDMessage,
  clientReadyMessage,
  clientWeightsMessageServer,
  clientPartialSumsMessageServer,
  serverReadyClients
}

export interface serverClientIDMessage {type: messageType, peerID: PeerID} // server sends client id to client
export interface clientReadyMessage {type: messageType, round: number} // client who sent is ready
export interface clientWeightsMessageServer {type: messageType, peerID: PeerID, weights: weights.Encoded, destination: PeerID} // client weights
export interface clientPartialSumsMessageServer {type: messageType, peerID: PeerID, partials: weights.Encoded, destination: PeerID} // client partial sum
export interface serverReadyClients {type: messageType, peerList: Array<PeerID>} // server send to client who to connect to
