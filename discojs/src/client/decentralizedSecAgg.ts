import { List, Set } from 'immutable'
import msgpack from 'msgpack-lite'
import * as secret_shares from '../secret_shares'
import { DecentralizedBase } from './decentralizedBase'
import * as messages from '../messages'

import { aggregation, serialization, TrainingInformant, Weights, privacy } from '..'

// minimum clients we want connected in order to start sharing
const MINIMUM_PEERS = 3

export class DecentralizedSecAgg extends DecentralizedBase {
  /*
  generates shares and sends to all ready peers adds differential privacy
   */
  private async sendShares (updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant): Promise<void> {
    // generate weight shares and add differential privacy
    const noisyWeights: Weights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    const weightShares: List<Weights> = await secret_shares.generateAllShares(noisyWeights, this.peers.length, 1000)

    // Broadcast our weights to ith peer in the SERVER LIST OF PEERS (seen in signaling_server.ts)
    for (let i = 0; i < this.peers.length; i++) {
      const weights = weightShares.get(i)
      if (weights === undefined) {
        throw new Error('weight shares generated incorrectly')
      }
      const msg: messages.clientWeightsMessageServer = {
        type: messages.messageType.clientWeightsMessageServer,
        peerID: this.ID,
        weights: await serialization.weights.encode(weights),
        destination: this.peers[i]
      }
      const encodedMsg = msgpack.encode(msg)
      this.sendMessagetoPeer(encodedMsg)
    }
  }

  /*
sends partial sums to connected peers so final update can be calculated
 */
  private async sendPartialSums (): Promise<void> {
    // calculating my personal partial sum from received shares that i will share with peers
    this.mySum = secret_shares.sum(List(Array.from(this.receivedWeights.values())))
    // calculate, encode, and send sum
    for (let i = 0; i < this.peers.length; i++) {
      const msg: messages.clientPartialSumsMessageServer = {
        type: messages.messageType.clientPartialSumsMessageServer,
        peerID: this.ID,
        partials: await serialization.weights.encode(this.mySum),
        destination: i
      }
      const encodedMsg = msgpack.encode(msg)
      this.sendMessagetoPeer(encodedMsg)
    }
  }

  override async sendAndReceiveWeights(updatedWeights: Weights, staleWeights: Weights,
                                     round: number, trainingInformant: TrainingInformant): Promise<List<Weights>>{
    await this.sendShares(updatedWeights, staleWeights, round, trainingInformant)

    // after all weights are received, send partial sum
    await this.pauseUntil(() => this.receivedWeights.size >= this.peers.length)
    await this.sendPartialSums()

    // after all partial sums are received, return final weight update
    await this.pauseUntil(() => this.receivedPartialSums.size >= this.peers.length)
    return this.receivedPartialSums
  }
}
