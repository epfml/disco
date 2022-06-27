import { List, Seq, Set } from 'immutable'
// import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
// import { URL } from 'url'
import * as decentralizedGeneral from './decentralized'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'

// import { Base } from './base'
import { DecentralizedGeneral } from './decentralized'
interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }

// TODO take it from the server sources
// type PeerID = number
// type EncodedSignal = Uint8Array
// type ServerOpeningMessage = PeerID[]
// type ServerPeerMessage = [PeerID, EncodedSignal]

// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class InsecureDecentralizedClient extends DecentralizedGeneral {
  peerOnData (peer: SimplePeer.Instance, peerID: number, data: any): void {
    const message = msgpack.decode(data)
    if (!decentralizedGeneral.isPeerMessage(message)) {
      throw new Error(`invalid message received from ${peerID}`)
    }
    const weights = serialization.weights.decode(message.weights)

    console.debug('peer', peerID, 'sent weights', weights)

    if (this.weights.get(peer)?.get(message.epoch) !== undefined) {
      throw new Error(`weights from ${peerID} already received`)
    }
    this.weights.set(peer,
      this.weights.get(peer, List<Weights>())
        .set(message.epoch, weights))
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    epoch: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    // Broadcast our weights
    const msg: PeerMessage = {
      epoch: epoch,
      weights: await serialization.weights.encode(noisyWeights)
    }
    const encodedMsg = msgpack.encode(msg)

    this.peers
      .filter((peer) => peer.connected)
      .forEach((peer, peerID) => {
        trainingInformant.addMessage(`Sending weights to peer ${peerID}`)
        trainingInformant.updateWhoReceivedMyModel(`peer ${peerID}`)

        peer.send(encodedMsg)
      })

    // Get weights from the others
    const getWeights = (): Seq.Indexed<Weights | undefined> =>
      this.weights
        .valueSeq()
        .map((epochesWeights) => epochesWeights.get(epoch))

    const timeoutError = new Error('timeout')
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        const gotAllWeights =
          getWeights().every((weights) => weights !== undefined)

        if (gotAllWeights) {
          clearInterval(interval)
          resolve()
        }
      }, TICK)

      setTimeout(() => {
        clearInterval(interval)
        reject(timeoutError)
      }, MAX_WAIT_PER_ROUND)
    }).catch((err) => {
      if (err !== timeoutError) {
        throw err
      }
    })

    const receivedWeights = getWeights()
      .filter((weights) => weights !== undefined)
      .toSet() as Set<Weights>

    // Average weights
    trainingInformant.addMessage('Averaging weights')
    trainingInformant.updateNbrUpdatesWithOthers(1)

    // Return the new "received" weights
    return aggregation.averageWeights(receivedWeights)
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }
}
