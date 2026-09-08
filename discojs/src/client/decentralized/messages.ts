import * as serialization from "#serialization/index";

import { type SignalData } from "#client/decentralized/peer";
import { isNodeID, type NodeID } from "#client/types";
import { MType, hasMessageType } from "#client/mtype";
import type {
  ClientConnected,
  WaitingForMoreParticipants,
  EnoughParticipants,
} from "#client/mtype";

/// Phase 0 communication (between server and peers)
export interface NewDecentralizedNodeInfo {
  type: MType.NewDecentralizedNodeInfo;
  id: NodeID;
  waitForMoreParticipants: boolean;
  nbOfParticipants: number;
  joinedMidTraining: boolean;
}

// WebRTC signal to forward to other node
export interface SignalForPeer {
  type: MType.SignalForPeer;
  peer: NodeID;
  signal: SignalData;
}

// peer wants to join the next round
export interface JoinRound {
  type: MType.JoinRound;
}

// peer who sent is ready
export interface PeerIsReady {
  type: MType.PeerIsReady;
}

// server sends to each peer the list of peers to connect to
export interface PeersForRound {
  type: MType.PeersForRound;
  peers: NodeID[];
  aggregationRound: number;
}

// peer sends to server to signal all the connections to other peers
// are established
export interface ConnectionsReady {
  type: MType.ConnectionsReady;
}

// Server signals each peer to start weight update sharing
export interface StartWeightSharing {
  type: MType.StartWeightSharing;
}

// Server signals peers to reestablish peer connections
export interface RetryPeerConnections {
  type: MType.RetryPeerConnections;
}

// Server signals a node that the connection with other peers failed
export interface ConnectionFail {
  type: MType.ConnectionFail;
}

// Nodes joining in the middle of the training send to server
// to request the latest model before starting local training
export interface ModelSyncRequest {
  type: MType.ModelSyncRequest;
}

// Server signals a node that shares the lastest model with node
// who joined in the middle of the training
export interface ProvideModelToPeer {
  type: MType.ProvideModelToPeer;
  newNode: NodeID;
}

// Server signals new node joining in the middle of the training
// about the model provider node
export interface ModelProviderInfo {
  type: MType.ModelProviderInfo;
  providerNode: NodeID;
}

// Sent by client to another client to share the latest model
export interface SharedModel {
  type: MType.SharedModel;
  model: serialization.Encoded;
}

/// Phase 1 communication (between peers)

export interface Payload {
  type: MType.Payload;
  peer: NodeID;
  aggregationRound: number;
  communicationRound: number;
  payload: serialization.Encoded;
}

/// Phase 2 communication (between peers)

export type MessageFromServer =
  | NewDecentralizedNodeInfo
  | SignalForPeer
  | PeersForRound
  | WaitingForMoreParticipants
  | EnoughParticipants
  | StartWeightSharing
  | RetryPeerConnections
  | ConnectionFail
  | ModelProviderInfo
  | ProvideModelToPeer;

export type MessageToServer =
  | ClientConnected
  | SignalForPeer
  | PeerIsReady
  | JoinRound
  | ConnectionsReady
  | ModelSyncRequest;

export type PeerMessage = Payload | SharedModel;

export function isMessageFromServer(o: unknown): o is MessageFromServer {
  if (!hasMessageType(o)) return false;

  switch (o.type) {
    case MType.NewDecentralizedNodeInfo:
      return (
        "id" in o &&
        isNodeID(o.id) &&
        "waitForMoreParticipants" in o &&
        typeof o.waitForMoreParticipants === "boolean"
      );
    case MType.SignalForPeer:
      return "peer" in o && isNodeID(o.peer) && "signal" in o;
    case MType.PeersForRound:
      return "peers" in o && Array.isArray(o.peers) && o.peers.every(isNodeID);
    case MType.WaitingForMoreParticipants:
    case MType.EnoughParticipants:
    case MType.StartWeightSharing:
    case MType.RetryPeerConnections:
    case MType.ConnectionFail:
    case MType.ModelProviderInfo:
    case MType.ProvideModelToPeer:
      return true;
  }

  return false;
}

export function isMessageToServer(o: unknown): o is MessageToServer {
  if (!hasMessageType(o)) return false;

  switch (o.type) {
    case MType.ClientConnected:
      return true;
    case MType.SignalForPeer:
      return "peer" in o && isNodeID(o.peer) && "signal" in o;
    case MType.JoinRound:
    case MType.PeerIsReady:
    case MType.ConnectionsReady:
    case MType.ModelSyncRequest:
      return true;
  }

  return false;
}

export function isPeerMessage(o: unknown): o is PeerMessage {
  if (!hasMessageType(o)) return false;

  switch (o.type) {
    case MType.Payload:
      return (
        "peer" in o &&
        isNodeID(o.peer) &&
        "payload" in o &&
        serialization.isEncoded(o.payload)
      );
    case MType.SharedModel:
      return "model" in o && serialization.isEncoded(o.model);
  }

  return false;
}
