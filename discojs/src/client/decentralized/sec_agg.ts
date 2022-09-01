import { List, Set } from 'immutable'

import { serialization, Task, TrainingInformant, Weights, aggregation } from '../..'

import { Base } from './base'
import * as messages from './messages'
import * as secret_shares from './secret_shares'
import { pauseUntil } from './utils'
import { PeerID } from './types'

/**
 * Decentralized client that utilizes secure aggregation so client updates remain private
 */
export class SecAgg extends Base {
  private readonly maxShareValue: number

  // TODO ensure that only one share or partial sum is sent per peer

  // list of weights received from other clients
  private receivedShares = List<Weights>()
  // list of partial sums received by client
  private receivedPartialSums = List<Weights>()
  // the partial sum calculated by the client

  constructor (
    public readonly url: URL,
    public readonly task: Task
  ) {
    super(url, task)
    this.maxShareValue = this.task.trainingInformation?.maxShareValue ?? 100
  }

  /*
  generates shares and sends to all ready peers adds differential privacy
   */
  private async sendShares (
    peers: Set<PeerID>,
    noisyWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<void> {
    // generate weight shares and add differential privacy
    const weightShares = secret_shares.generateAllShares(noisyWeights, peers.size + 1, this.maxShareValue)

    this.receivedShares = List.of(weightShares.first())

    const encodedWeightShares = List(await Promise.all(
      weightShares.rest().map(async (weights) =>
        await serialization.weights.encode(weights))))

    // Broadcast our weights to ith peer in the SERVER LIST OF PEERS (seen in signaling_server.ts)
    peers.toIndexedSeq().zip(encodedWeightShares).forEach(([peer, weights]) =>
      this.sendMessagetoPeer({
        type: messages.type.Shares,
        peer,
        weights
      })
    )
  }

  /*
sends partial sums to connected peers so final update can be calculated
 */
  private async sendPartialSums (peers: Set<PeerID>): Promise<void> {
    // calculating my personal partial sum from received shares that i will share with peers
    const mySum = aggregation.sumWeights(this.receivedShares)
    const myEncodedSum = await serialization.weights.encode(mySum)

    this.receivedPartialSums = List.of(mySum)

    // calculate, encode, and send sum
    peers.forEach((peer) =>
      this.sendMessagetoPeer({
        type: messages.type.PartialSums,
        peer,
        partials: myEncodedSum
      })
    )
  }

  override async sendAndReceiveWeights (
    peers: Set<PeerID>,
    noisyWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<List<Weights>> {
    // PHASE 1 COMMUNICATION --> send additive shares to ready peers, pause program until shares are received from all peers
    await this.sendShares(peers, noisyWeights, round, trainingInformant)
    await pauseUntil(() => this.receivedShares.size >= peers.size)

    // PHASE 2 COMMUNICATION --> send partial sums to ready peers
    await this.sendPartialSums(peers)
    // after all partial sums are received, return list of partial sums to be aggregated
    await pauseUntil(() => this.receivedPartialSums.size >= peers.size)
    trainingInformant.update({
      currentNumberOfParticipants: this.receivedPartialSums.size
    })

    return this.receivedPartialSums
  }

  override clientHandle (msg: messages.PeerMessage): void {
    switch (msg.type) {
      // update received weights by one weights reception
      case messages.type.Shares: {
        const weights = serialization.weights.decode(msg.weights)
        this.receivedShares = this.receivedShares.push(weights)
        break
      }
      // update received partial sums by one partial sum
      case messages.type.PartialSums: {
        const partials: Weights = serialization.weights.decode(msg.partials)
        this.receivedPartialSums = this.receivedPartialSums.push(partials)
        break
      }
      default:
        throw new Error(`unexpected message type: ${msg.type}`)
    }
  }
}
