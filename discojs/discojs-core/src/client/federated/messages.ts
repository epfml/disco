import { type client, type MetadataKey, type MetadataValue } from '../../index.js'
import { type weights } from '../../serialization/index.js'

import { type, hasMessageType, type AssignNodeID, type ClientConnected } from '../messages.js'

export type MessageFederated =
  ClientConnected |
  SendPayload |
  ReceiveServerPayload |
  RequestServerStatistics |
  ReceiveServerStatistics |
  ReceiveServerMetadata |
  AssignNodeID

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
export interface RequestServerStatistics {
  type: type.RequestServerStatistics
}
export interface ReceiveServerStatistics {
  type: type.ReceiveServerStatistics
  statistics: Record<string, number>
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
    case type.RequestServerStatistics:
      return true
    case type.ReceiveServerStatistics:
      return true
    case type.ReceiveServerMetadata:
      return true
    case type.AssignNodeID:
      return true
    default:
      return false
  }
}
