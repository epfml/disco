import { type weights } from '../../serialization/index.js'

import { type, hasMessageType, type AssignNodeID, type ClientConnected } from '../messages.js'

export type MessageFederated =
  ClientConnected |
  SendPayload |
  ReceiveServerPayload |
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

export function isMessageFederated (raw: unknown): raw is MessageFederated {
  if (!hasMessageType(raw)) {
    return false
  }

  switch (raw.type) {
    case type.ClientConnected:
    case type.SendPayload:
    case type.ReceiveServerPayload:
    case type.AssignNodeID:
      return true
  }

  return false
}
