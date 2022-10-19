import { MetadataID } from '../..'
import { weights } from '../../serialization'

export enum messageType {
  clientConnected,
  postWeightsToServer,
  postMetadata,
  getMetadataMap,
  latestServerRound,
  pullRoundAndFetchWeights,
  pullServerStatistics,
}

// base class for all messages
export interface messageGeneral {
  type: messageType
}
export interface postWeightsToServer extends messageGeneral {
  weights: weights.Encoded
  round: number
}
export interface latestServerRound extends messageGeneral {
  weights: weights.Encoded
  round: number
}
export interface pullServerStatistics extends messageGeneral {
  statistics: Record<string, number>
}
export interface postMetadata extends messageGeneral {
  clientId: string
  taskId: string
  round: number
  metadataId: string
  metadata: string
}
export interface getMetadataMap extends messageGeneral {
  clientId: string
  taskId: string
  round: number
  metadataId: MetadataID
  metadataMap?: Array<[string, string | undefined]>
}
