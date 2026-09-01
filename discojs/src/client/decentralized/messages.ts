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
  | EnoughParticipants;

export type MessageToServer =
  | ClientConnected
  | SignalForPeer
  | PeerIsReady
  | JoinRound;

export type PeerMessage = Payload;

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
      return "peer" in o && isNodeID(o.peer) && "signal" in o; // TODO check signal content?
    case MType.PeersForRound:
      return "peers" in o && Array.isArray(o.peers) && o.peers.every(isNodeID);
    case MType.WaitingForMoreParticipants:
    case MType.EnoughParticipants:
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
      return "peer" in o && isNodeID(o.peer) && "signal" in o; // TODO check signal content?
    case MType.JoinRound:
    case MType.PeerIsReady:
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
  }

  return false;
}
