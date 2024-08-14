import { type weights } from '../../serialization/index.js'

import {
  type, hasMessageType, type AssignNodeID, type ClientConnected, type ClientDisconnected,
 } from '../messages.js'

 // See ../messages.ts for doc
export type MessageFederated =
  ClientConnected |
  ClientDisconnected |
  SendPayload |
  ReceiveServerPayload |
  WaitingForMoreParticipants |
  EnoughParticipants |
  AssignNodeID

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
    case type.ClientDisconnected:
    case type.SendPayload:
    case type.ReceiveServerPayload:
    case type.AssignNodeID:
    case type.WaitingForMoreParticipants:
    case type.EnoughParticipants:
      return true
  }

  return false
}
