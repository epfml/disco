import * as serialization from "#serialization/index";
import type { NodeID } from "#client/types";

import { MType, hasMessageType } from "#client/mtype";
import type {
  ClientConnected,
  WaitingForMoreParticipants,
  EnoughParticipants,
} from "#client/mtype";

// See ../messages.ts for doc
export type MessageFederated =
  | ClientConnected
  | NewFederatedNodeInfo
  | SendPayload
  | ReceiveServerPayload
  | WaitingForMoreParticipants
  | EnoughParticipants;

export interface NewFederatedNodeInfo {
  type: MType.NewFederatedNodeInfo;
  id: NodeID;
  waitForMoreParticipants: boolean;
  payload: serialization.Encoded;
  round: number;
  nbOfParticipants: number;
}

export interface SendPayload {
  type: MType.SendPayload;
  payload: serialization.Encoded;
  round: number;
}
export interface ReceiveServerPayload {
  type: MType.ReceiveServerPayload;
  payload: serialization.Encoded;
  round: number;
  nbOfParticipants: number; // number of peers contributing to a federated training
}

export function isMessageFederated(raw: unknown): raw is MessageFederated {
  if (!hasMessageType(raw)) {
    return false;
  }

  switch (raw.type) {
    case MType.ClientConnected:
    case MType.NewFederatedNodeInfo:
    case MType.SendPayload:
    case MType.ReceiveServerPayload:
    case MType.WaitingForMoreParticipants:
    case MType.EnoughParticipants:
      return true;
  }

  return false;
}
