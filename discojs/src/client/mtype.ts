/**
 * Type of every message exchanged between clients and the server.
 * The values are what goes over the wire
 *
 * We use a string enum rather than the default implicit integer enum
 * because reordering an integer enum changes the messages' implicit value
 * which can break compatibility between different builds
 */
export enum MType {
  /* Both schemes */
  // Sent from client to server as first point of contact to join a task.
  // The server answers with a node id in a NewFederatedNodeInfo
  // or NewDecentralizedNodeInfo message
  ClientConnected = "ClientConnected",
  // Sent by the server to notify clients that there are not enough
  // participants to continue training
  WaitingForMoreParticipants = "WaitingForMoreParticipants",
  // Sent by the server to notify clients that there are now enough
  // participants to start training collaboratively
  EnoughParticipants = "EnoughParticipants",
  // Sent by the server when a participant joined or left, so that
  // clients don't have to wait for the end of the round to learn about it
  ParticipantsUpdate = "ParticipantsUpdate",

  /* Decentralized */
  // When a user joins a task with a ClientConnected message, the server
  // answers with its peer id and also tells the client whether we are waiting
  // for more participants before starting training
  NewDecentralizedNodeInfo = "NewDecentralizedNodeInfo",
  // Sent by peers to the server to signal they want to join the next round
  JoinRound = "JoinRound",
  // Sent by nodes to the server signaling they are ready to start the next round
  PeerIsReady = "PeerIsReady",
  // Sent by the server to participating peers containing the list
  // of peers for the round
  PeersForRound = "PeersForRound",
  // Forwarded by the server from a client to another client
  // to establish a peer-to-peer (WebRTC) connection
  SignalForPeer = "SignalForPeer",
  // Sent by nodes to the server to signal all connections are established
  ConnectionsReady = "ConnectionsReady",
  // Sent by the server to signal nodes proceed to weight update sharing
  StartWeightSharing = "StartWeightSharing",
  // Sent by the server to signal nodes reestablish connections
  RetryPeerConnections = "RetryPeerConnections",
  // Sent by the server to signal that the node's connection was not successful
  ConnectionFail = "ConnectionFail",
  // The weight update, sent from peer to peer
  Payload = "Payload",
  // Sent by nodes to the server to request the latest model
  ModelSyncRequest = "ModelSyncRequest",
  // Sent by the server to nodes to share the provider node info
  ModelProviderInfo = "ModelProviderInfo",
  // Sent by the server to the node who was selected as a model provider node
  ProvideModelToPeer = "ProvideModelToPeer",
  // Sent by node to node to share the latest model weights
  SharedModel = "SharedModel",

  /* Federated */
  // The server answers the ClientConnected message with the necessary information
  // to start training: node id, latest model global weights, current round etc
  NewFederatedNodeInfo = "NewFederatedNodeInfo",
  // Sent by clients to the server with their weight update for the round
  SendPayload = "SendPayload",
  // Sent by the server to clients with the aggregated weights of the round
  ReceiveServerPayload = "ReceiveServerPayload",
  CrashClient = "CrashClient",
}

const MTYPES: ReadonlySet<unknown> = new Set(Object.values(MType));

export function hasMessageType(
  raw: unknown,
): raw is { type: MType } & Record<string, unknown> {
  if (typeof raw !== "object" || raw === null) return false;

  const o = raw as Record<string, unknown>;
  return "type" in o && typeof o.type === "string" && MTYPES.has(o.type);
}

export interface ClientConnected {
  type: MType.ClientConnected;
}

export interface EnoughParticipants {
  type: MType.EnoughParticipants;
  nbOfParticipants: number;
}

export interface WaitingForMoreParticipants {
  type: MType.WaitingForMoreParticipants;
  nbOfParticipants: number;
}

export interface ParticipantsUpdate {
  type: MType.ParticipantsUpdate;
  nbOfParticipants: number;
}

export interface CrashClient {
  type: MType.CrashClient;
  reason: string;
}
