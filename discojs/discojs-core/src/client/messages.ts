import * as decentralized from './decentralized/messages'
import * as federated from './federated/messages'

export enum type {
  clientConnected,

  // decentralized
  PeerID,
  SignalForPeer,

  PeerIsReady,
  PeersForRound,

  Weights,
  Shares,

  PartialSums,

  // federated
  postWeightsToServer,
  postMetadata,
  getMetadataMap,
  latestServerRound,
  pullRoundAndFetchWeights,
  pullServerStatistics,
}

export interface Geolocation {
  readonly coords: {
    readonly accuracy: number
    readonly altitude: number | null
    readonly altitudeAccuracy: number | null
    readonly heading: number | null
    readonly latitude: number
    readonly longitude: number
    readonly speed: number | null
  }
  readonly timestamp: number
}

export interface clientConnected {
  type: type.clientConnected
  geolocation: Geolocation
}

export type Message =
  decentralized.MessageFromServer |
  decentralized.MessageToServer |
  decentralized.PeerMessage |
  federated.MessageFederated

// Retrieve a specific message interface from the type D. i.e. NarrowMessage<messages.type.PeerId> => messages.PeerId type
export type NarrowMessage<D> = Extract<Message, { type: D }>

export function hasMessageType (raw: unknown): raw is {type: type} & Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const o = raw as Record<string, unknown>
  if (
    !('type' in o && typeof o.type === 'number' && o.type in type)
  ) {
    return false
  }

  return true
}
