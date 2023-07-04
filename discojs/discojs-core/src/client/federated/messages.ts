import { client, MetadataKey, MetadataValue } from '../..'
import { weights } from '../../serialization'

import { type, hasMessageType } from '../messages'

export type MessageFederated =
  SendPayload |
  ReceiveServerPayload |
  ReceiveServerStatistics |
  SendMetadata |
  ReceiveServerMetadata |
  MessageBase

// Base class for all messages
export interface MessageBase {
  type: type
}
export interface SendPayload {
  type: type.SendPayload
  payload: weights.Encoded
  round: number
}
export interface ReceiveServerPayload {
  type: type.ReceiveServerPayload
  payload: weights.Encoded
  round: number
}
export interface ReceiveServerStatistics {
  type: type.ReceiveServerStatistics
  statistics: Record<string, number>
}
export interface SendMetadata {
  type: type.SendMetadata
  nodeId: string
  taskId: string
  round: number
  key: MetadataKey
  value: MetadataValue
}
export interface ReceiveServerMetadata {
  type: type.ReceiveServerMetadata
  nodeId: client.NodeID
  taskId: string
  round: number
  key: MetadataKey
  metadataMap?: Array<[client.NodeID, MetadataValue | undefined]>
}

export function isMessageFederated (raw: unknown): raw is MessageFederated {
  if (!hasMessageType(raw)) {
    return false
  }

  switch (raw.type) {
    case type.ClientConnected:
      return true
    case type.SendPayload:
      return true
    case type.ReceiveServerPayload:
      return true
    case type.ReceiveServerStatistics:
      return true
    case type.SendMetadata:
      return true
    case type.ReceiveServerMetadata:
      return true
    case type.AssignNodeID:
      return true
    default:
      return false
  }
}
