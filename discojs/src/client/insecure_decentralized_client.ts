import { List, Seq, Set, Map } from 'immutable'
// import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
// import { URL } from 'url'
import * as decentralizedGeneral from './decentralized'

import { aggregation, privacy, serialization, TrainingInformant, Weights} from '..'
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

  private sendReadyMessage (round: number): void {
    // Broadcast our readiness
    const msg: messages.clientReadyMessage = {type:messages.messageType.clientReadyMessage, round:round}

    const encodedMsg = msgpack.encode(msg)
    if (this.server === undefined){
      throw new Error('server undefined, could not connect peers')
    }
    this.server.send(encodedMsg) //why sending an encoded message?
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    // send message to server that we ready
    this.peers = List()
    this.sendReadyMessage(round)

    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)

    // Broadcast our weights
    const msg: messages.clientWeightsMessageServer = {type: messages.messageType.clientWeightsMessageServer, peerID: this.ID, weights: await serialization.weights.encode(noisyWeights)}
    const encodedMsg = msgpack.encode(msg)
    let peerSize: number = arbitraryNegativeNumber

    const timeoutError = new Error('timeout')
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        if(this.peers.size>=minimumPeers){
            peerSize = this.peers.size
            if(this.server ===undefined){
              throw new Error ('server undefined so we cannot send weights through it')
            }
            this.peerMessageTemp(encodedMsg)
        }
        const gotAllWeights = (this.receivedWeights.size===peerSize)
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
    console.log('finalWeights Size', finalWeights.size)

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
