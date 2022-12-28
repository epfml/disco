import { MetadataID } from '../..'
import { weights } from '../../serialization'

import { type, hasMessageType } from '../messages'

export type MessageFederated =
  postToServer |
  latestServerRound |
  pullServerStatistics |
  postMetadata |
  getMetadataMap |
  messageGeneral

// base class for all messages
export interface messageGeneral {
  type: type
}
export interface postToServer {
  type: type.postToServer
  weights?: weights.Encoded
  momentum?: weights.Encoded
  round: number
}
export interface latestServerRound {
  type: type.latestServerRound
  weights: weights.Encoded
  round: number
}
export interface pullServerStatistics {
  type: type.pullServerStatistics
  statistics: Record<string, number>
}
export interface postMetadata {
  type: type.postMetadata
  clientId: string
  taskId: string
  round: number
  metadataId: string
  metadata: string
}
export interface getMetadataMap {
  type: type.getMetadataMap
  clientId: string
  taskId: string
  round: number
  metadataId: MetadataID
  metadataMap?: Array<[string, string | undefined]>
}

export function isMessageFederated (o: unknown): o is MessageFederated {
  if (!hasMessageType(o)) {
    return false
  }

  switch (o.type) {
    case type.clientConnected:
      return true
    case type.postToServer:
      return true
    case type.latestServerRound:
      return true
    case type.pullServerStatistics:
      return true
    case type.postMetadata:
      return true
    case type.getMetadataMap:
      return true
  }

  return false
}
