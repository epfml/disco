export enum MType {
  // Sent from client to server as first point of contact to join a task.
  // The server answers with an node id in a NewFederatedNodeInfo
  // or NewDecentralizedNodeInfo message
  ClientConnected,

  /* Decentralized */
  // When a user joins a task with a ClientConnected message, the server
  // answers with  its peer id and also tells the client whether we are waiting
  // for more participants before starting training
  NewDecentralizedNodeInfo,
  // Message sent by peers to the server to signal they want to
  // join the next round
  JoinRound,
  // Message sent by nodes to server signaling they are ready to
  // start the next round
  PeerIsReady,
  // Sent by the server to participating peers containing the list
  // of peers for the round
  PeersForRound,
  // Message forwarded by the server from a client to another client
  // to establish a peer-to-peer (WebRTC) connection
  SignalForPeer,
  // Message sent by nodes to server to signal all connections are established
  ConnectionsReady,
  // Sent by the server to signal nodes proceed to weight update sharing
  StartWeightSharing,
  // Sent by the server to signal nodes reestablish connections
  RetryPeerConnections,
  // Sent by the server to signal that the node's connection was not successful
  ConnectionFail,
  // The weight update
  Payload,
  // Sent by nodes to the server to request the latest model
  ModelSyncRequest,
  // Sent by the server to nodes to share the provider node info
  ModelProviderInfo,
  // Sent by the server to the node who was selected as a model provider node
  ProvideModelToPeer,
  // Sent by node to node to share the latest model weights
  SharedModel,

  /* Federated */
  // The server answers the ClientConnected message with the necessary information
  // to start training: node id, latest model global weights, current round etc
  NewFederatedNodeInfo,
  // Message sent by server to notify clients that there are not enough
  // participants to continue training
  WaitingForMoreParticipants,
  // Message sent by server to notify clients that there are now enough
  // participants to start training collaboratively
  EnoughParticipants,
  SendPayload,
  ReceiveServerPayload,

  /* Both schemes */
  // Message sent by the server when a participant joined or left, so that
  // clients don't have to wait for the end of the round to learn about it.
  // Kept last as the enum values are what goes over the wire.
  ParticipantsUpdate,
}

export function hasMessageType(
  raw: unknown,
): raw is { type: MType } & Record<string, unknown> {
  if (typeof raw !== "object" || raw === null) return false;

  const o = raw as Record<string, unknown>;
  if (!("type" in o && typeof o.type === "number" && o.type in MType)) {
    return false;
  }

  return true;
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
