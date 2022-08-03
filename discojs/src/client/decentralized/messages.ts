import { weights } from '../../serialization'
// import {Set} from 'immutable'
import { PeerID } from './types'
import { TaskID } from '../../task'

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

export interface messageGeneral{type: messageType}
export interface serverClientIDMessage extends messageGeneral {peerID: PeerID} // server sends client id to client
export interface clientReadyMessage extends messageGeneral {round: number, task: TaskID, peerID: PeerID} // client who sent is ready
export interface clientWeightsMessageServer extends messageGeneral {peerID: PeerID, weights: weights.Encoded, destination: PeerID} // client weights
export interface clientSharesMessageServer extends messageGeneral {peerID: PeerID, weights: weights.Encoded, destination: PeerID} // client weights
export interface clientPartialSumsMessageServer extends messageGeneral {peerID: PeerID, partials: weights.Encoded, destination: PeerID} // client partial sum
export interface serverReadyClients extends messageGeneral {peerList: PeerID[]} // server send to client who to connect to
