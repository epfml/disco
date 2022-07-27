import { List } from 'immutable'
import msgpack from 'msgpack-lite'

import { serialization, TrainingInformant, Weights } from '../..'
import { Base } from './base'
import * as messages from './messages'
import * as secret_shares from './secret_shares'

/**
 * Decentralized client that utilizes secure aggregation so client updates remain private
 */
export class SecAgg extends Base {
  // list of weights received from other clients
  private receivedShares: List<Weights> = List()
  // list of partial sums received by client
  private receivedPartialSums: List<Weights> = List()
  // the partial sum calculated by the client
  private mySum: Weights = []
  /*
  generates shares and sends to all ready peers adds differential privacy
   */
  private async sendShares (
    noisyWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<void> {
    // generate weight shares and add differential privacy
    const weightShares: List<Weights> = secret_shares.generateAllShares(noisyWeights, this.peers.length, this.maxShareValue)
    // Broadcast our weights to ith peer in the SERVER LIST OF PEERS (seen in signaling_server.ts)
    for (let i = 0; i < this.peers.length; i++) {
      const weights = weightShares.get(i)
      if (weights === undefined) {
        throw new Error('weight shares generated incorrectly')
      }
      const msg: messages.clientSharesMessageServer = {
        type: messages.messageType.clientSharesMessageServer,
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
    this.mySum = secret_shares.sum(List(Array.from(this.receivedShares.values())))
    // calculate, encode, and send sum
    for (let i = 0; i < this.peers.length; i++) {
      const msg: messages.clientPartialSumsMessageServer = {
        type: messages.messageType.clientPartialSumsMessageServer,
        peerID: this.ID,
        partials: await serialization.weights.encode(this.mySum),
        destination: this.peers[i]
      }
      const encodedMsg = msgpack.encode(msg)
      this.sendMessagetoPeer(encodedMsg)
    }
  }

  override async sendAndReceiveWeights (noisyWeights: Weights,
    round: number, trainingInformant: TrainingInformant): Promise<List<Weights>> {
    // reset fields at beginning of each round
    this.receivedShares = this.receivedShares.clear()
    this.receivedPartialSums = this.receivedPartialSums.clear()

    // PHASE 1 COMMUNICATION --> send additive shares to ready peers, pause program until shares are received from all peers
    await this.sendShares(noisyWeights, round, trainingInformant)
    await this.pauseUntil(() => this.receivedShares.size >= this.peers.length)

    // PHASE 2 COMMUNICATION --> send partial sums to ready peers
    await this.sendPartialSums()
    // after all partial sums are received, return list of partial sums to be aggregated
    await this.pauseUntil(() => this.receivedPartialSums.size >= this.peers.length)
    return this.receivedPartialSums
  }

  override clientHandle (msg: any): void {
    if (msg.type === messages.messageType.clientSharesMessageServer) {
      // update received weights by one weights reception
      const weights = serialization.weights.decode(msg.weights)
      this.receivedShares = this.receivedShares.push(weights)
    } else if (msg.type === messages.messageType.clientPartialSumsMessageServer) {
      // update received partial sums by one partial sum
      const partials: Weights = serialization.weights.decode(msg.partials)
      this.receivedPartialSums = this.receivedPartialSums.push(partials)
    } else {
      throw new Error('Unexpected Message Type')
    }
  }
}
