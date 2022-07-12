import {List, Set} from 'immutable'
import {weights} from './serialization'

export type PeerID = number
export type EncodedSignal = Uint8Array

export enum messageType {
  serverClientIDMessage,
  clientReadyMessage,
  clientWeightsMessageServer,
  clientPartialSumsMessageServer,
  serverConnectedClients
}

export interface serverClientIDMessage {type: messageType, peerID: PeerID} //server sends client id to client
export interface clientReadyMessage {type: messageType, round:number} //client who sent is ready
export interface clientWeightsMessageServer {type: messageType, peerID: PeerID, weights: weights.Encoded} //client weights
export interface clientPartialSumsMessageServer {type: messageType, peerID: PeerID, partials: EncodedSignal} //client partial sum
export interface serverConnectedClients {type: messageType, peerList: List<PeerID>} //server send to client who to connect to

