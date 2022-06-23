import { List, Map, Set } from 'immutable'
import isomorphic from 'isomorphic-ws'
// import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
// import { URL } from 'url'

import { serialization, TrainingInformant, Weights } from '..'

import { Base } from './base'

interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }

// TODO take it from the server sources
type PeerID = number
type EncodedSignal = Uint8Array
type ServerOpeningMessage = PeerID[]
type ServerPeerMessage = [PeerID, EncodedSignal]

export function isPeerMessage (data: unknown): data is PeerMessage {
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('epoch', 'weights'))) {
    return false
  }
  const { epoch, weights } = data as Record<'epoch' | 'weights', unknown>

  if (
    typeof epoch !== 'number' ||
    !serialization.weights.isEncoded(weights)
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: PeerMessage = { epoch, weights }

  return true
}

export function isServerOpeningMessage (msg: unknown): msg is ServerOpeningMessage {
  if (!(msg instanceof Array)) {
    return false
  }

  if (!msg.every((elem) => typeof elem === 'number')) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: ServerOpeningMessage = msg

  return true
}

export function isServerPeerMessage (msg: unknown): msg is ServerPeerMessage {
  if (!(msg instanceof Array)) {
    return false
  }
  if (msg.length !== 2) {
    return false
  }

  const [id, signal] = msg
  if (typeof id !== 'number') {
    return false
  }
  if (!(signal instanceof Uint8Array)) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: ServerPeerMessage = [id, signal]

  return true
}

// Time to wait between network checks in milliseconds.
// const TICK = 100

// Time to wait for the others in milliseconds.
// const MAX_WAIT_PER_ROUND = 10_000

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export abstract class DecentralizedGeneral extends Base {
  protected server?: isomorphic.WebSocket
  protected peers = Map<PeerID, SimplePeer.Instance>()

  protected readonly weights = Map<SimplePeer.Instance, List<Weights | undefined>>()

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect (): Promise<void> {
    this.peers.forEach((peer) => peer.destroy())
    this.peers = Map()

    this.server?.close()
    this.server = undefined
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }
  abstract onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    epoch: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights|undefined >
}
