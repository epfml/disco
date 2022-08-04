import { weights } from '../../serialization'
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

// base class for all messages
export interface messageGeneral{type: messageType}
// server sends client id to client
export interface serverClientIDMessage extends messageGeneral {peerID: PeerID}
// clients sends to server that they are ready to share updates
export interface clientReadyMessage extends messageGeneral {round: number, task: TaskID, peerID: PeerID}
// client sends to server/server sends to client (will be replaced with peer2peer) model updates, from peerID, sending to destination
export interface clientWeightsMessageServer extends messageGeneral {peerID: PeerID, weights: weights.Encoded, destination: PeerID}
// client sends to server/server sends to client (will be replaced with peer2peer) generated shares, from peerID, sending to destination
export interface clientSharesMessageServer extends messageGeneral {peerID: PeerID, weights: weights.Encoded, destination: PeerID}
// client sends to server/server sends to client (will be replaced with peer2peer) partial sums, from peerID, sending to destination
export interface clientPartialSumsMessageServer extends messageGeneral {peerID: PeerID, partials: weights.Encoded, destination: PeerID}
// server sends to client an array of peerIDs to connect to
export interface serverReadyClients extends messageGeneral {peerList: PeerID[]}
