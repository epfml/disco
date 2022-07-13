import { List, Set } from 'immutable'
import msgpack from 'msgpack-lite'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'
import { DecentralizedGeneral } from './decentralized'
import * as messages from '../messages'

// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

const minimumPeers = 3

const arbitraryNegativeNumber = -10

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class InsecureDecentralized extends DecentralizedGeneral {

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    // send message to server that we ready
    this.peers = List<number>()
    this.sendReadyMessage(round)

    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    const weightsToSend = await serialization.weights.encode(noisyWeights)

    // Broadcast our weights
    let peerSize: number = arbitraryNegativeNumber

    const timeoutError = new Error('timeout')
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        if (this.peers.size >= minimumPeers) {
          peerSize = this.peers.size
          if (this.server === undefined) {
            throw new Error('server undefined so we cannot send weights through it')
          }
          // console.log(typeof(this.peers.get(0)))
          for (let peerDest of this.peers){
            const msg: messages.clientWeightsMessageServer = { type: messages.messageType.clientWeightsMessageServer, peerID: this.ID,
         weights: weightsToSend, destination: peerDest}
          const encodedMsg = msgpack.encode(msg)
          this.peerMessageTemp(encodedMsg)
          }
        }
        const gotAllWeights = (this.receivedWeights.size === peerSize)
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

    const weightsArray = Array.from(this.receivedWeights.values())
    const finalWeights = Set(weightsArray)

    // Average weights
    trainingInformant.addMessage('Averaging weights')
    trainingInformant.updateNbrUpdatesWithOthers(1)
    // Return the new "received" weights
    return aggregation.averageWeights(finalWeights)
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }
}
