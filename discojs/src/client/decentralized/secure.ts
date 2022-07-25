import { List, Set } from 'immutable'
import msgpack from 'msgpack-lite'

import { Base } from './base'
import * as secret_shares from './secret_shares'
import * as messages from './messages'

import { aggregation, serialization, TrainingInformant, Weights, privacy } from '../..'

// minimum clients we want connected in order to start sharing
const minimumPeers = 3

export class Secure extends Base {
  /*
  generates shares and sends to all connected peers, adds differential privacy
   */
  private async sendShares (updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant): Promise<void> {
    // generate weight shares and add differential privacy
    const noisyWeights: Weights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    const weightShares: List<Weights> = await secret_shares.generateAllShares(noisyWeights, this.peers.size, 1000)

    // Broadcast our weights to ith peer in the SERVER LIST OF PEERS (seen in signaling_server.ts)
    for (let i = 0; i < this.peers.size; i++) {
      const weights = weightShares.get(i)
      if (weights === undefined) {
        throw new Error('weight shares generated incorrectly')
      }
      const msg: messages.clientWeightsMessageServer = {
        type: messages.messageType.clientWeightsMessageServer,
        peerID: this.ID,
        weights: await serialization.weights.encode(weights),
        destination: i
      }
      const encodedMsg = msgpack.encode(msg)
      this.peerMessageTemp(encodedMsg)
    }
  }

  /*
sends partial sums to connected peers so final update can be calculated
 */
  private async sendPartialSums (): Promise<void> {
    // calculating my personal partial sum from received shares that i will share with peers
    this.mySum = secret_shares.sum(List(Array.from(this.receivedWeights.values())))
    // calculate, encode, and send sum
    for (let i = 0; i < this.peers.size; i++) {
      const msg: messages.clientPartialSumsMessageServer = {
        type: messages.messageType.clientPartialSumsMessageServer,
        peerID: this.ID,
        partials: await serialization.weights.encode(this.mySum),
        destination: i
      }
      const encodedMsg = msgpack.encode(msg)
      this.peerMessageTemp(encodedMsg)
    }
  }

  // send message that we are ready at end of round, if enough people are ready, calls sendShares
  override async onRoundEndCommunication (updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant): Promise<Weights> {
    // send ready message
    this.sendReadyMessage(round)

    // after peers are connected, send shares
    await this.resolvePause(() => this.peers.size >= minimumPeers)
    await this.sendShares(updatedWeights, staleWeights, round, trainingInformant)

    // after all weights are received, send partial sum
    await this.resolvePause(() => this.receivedWeights.size >= minimumPeers)
    await this.sendPartialSums()

    // after all partial sums are received, return final weight update
    await this.resolvePause(() => this.receivedPartialSums.size >= minimumPeers)
    // console.log(this.ID, 'has the following received sum shape', this.receivedPartialSums.get(this.ID)[136])
    const setWeights: Set<Weights> = this.receivedPartialSums.toSet()
    return aggregation.averageWeights(setWeights)
  }
}
