import { type weights } from '../../serialization/index.js'
import { type NodeID } from '..//types.js'

import {
  type, hasMessageType, type ClientConnected
 } from '../messages.js'

 // See ../messages.ts for doc
export type MessageFederated =
  ClientConnected |
  NewFederatedNodeInfo |
  SendPayload |
  ReceiveServerPayload |
  WaitingForMoreParticipants |
  EnoughParticipants

export interface NewFederatedNodeInfo {
  type: type.NewFederatedNodeInfo
  id: NodeID
  waitForMoreParticipants: boolean
  payload: weights.Encoded
  round: number
  nbOfParticipants: number
}

export interface SendPayload {
  type: type.SendPayload
  payload: weights.Encoded
  round: number
}
export interface ReceiveServerPayload {
  type: type.ReceiveServerPayload
  payload: weights.Encoded
  round: number,
  nbOfParticipants: number // number of peers contributing to a federated training
}

export interface EnoughParticipants {
  type: type.EnoughParticipants
}

export interface WaitingForMoreParticipants {
  type: type.WaitingForMoreParticipants
}

export function isMessageFederated (raw: unknown): raw is MessageFederated {
  if (!hasMessageType(raw)) {
    return false
  }

  switch (raw.type) {
    case type.ClientConnected:
    case type.NewFederatedNodeInfo:
    case type.SendPayload:
    case type.ReceiveServerPayload:
    case type.WaitingForMoreParticipants:
    case type.EnoughParticipants:
      return true
  }

  return false
}
