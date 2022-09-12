import { weights } from '../../serialization'

export enum messageType {
  // Phase 0 communication (just between server and client)
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
