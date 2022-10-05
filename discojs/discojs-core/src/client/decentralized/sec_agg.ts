import { List, Map } from 'immutable'

import { serialization, Task, TrainingInformant, WeightsContainer, aggregation } from '../..'

import { Base } from './base'
import { PeerID } from './types'
import * as messages from './messages'
import { type } from '../messages'
import * as secret_shares from './secret_shares'
import { PeerConnection, waitMessage } from '../event_connection'

/**
 * Decentralized client that utilizes secure aggregation so client updates remain private
 */
export class SecAgg extends Base {
  private readonly maxShareValue: number

  // TODO ensure that only one share or partial sum is sent per peer

  // list of weights received from other clients
  private receivedShares?: Promise<List<WeightsContainer>>
  // list of partial sums received by client
  private receivedPartialSums?: Promise<List<WeightsContainer>>

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
    peers: Map<PeerID, PeerConnection>,
    weightShares: List<WeightsContainer>,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<void> {
    const encodedWeightShares = List(await Promise.all(
      weightShares.rest().map(async (weights) =>
        await serialization.weights.encode(weights))))

    // Broadcast our weights to ith peer in the SERVER LIST OF PEERS (seen in signaling_server.ts)
    peers
      .entrySeq()
      .toSeq()
      .zip(encodedWeightShares)
      .forEach(([[id, peer], weights]) =>
        this.sendMessagetoPeer(peer, {
          type: type.Shares,
          peer: id,
          weights
        })
      )
  }

  /*
sends partial sums to connected peers so final update can be calculated
 */
  private async sendPartialSums (partial: WeightsContainer, peers: Map<PeerID, PeerConnection>): Promise<void> {
    const myEncodedSum = await serialization.weights.encode(partial)

    // calculate, encode, and send sum
    peers.forEach((peer, id) =>
      this.sendMessagetoPeer(peer, {
        type: type.PartialSums,
        peer: id,
        partials: myEncodedSum
      })
    )
  }

  override async sendAndReceiveWeights (
    peers: Map<PeerID, PeerConnection>,
    noisyWeights: WeightsContainer,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<List<WeightsContainer>> {
    if (!this.receivedShares || !this.receivedPartialSums) {
      throw new Error('no promise setup for receiving weights')
    }
    // PHASE 1 COMMUNICATION --> send additive shares to ready peers, pause program until shares are received from all peers
    // generate weight shares and add differential privacy
    const weightShares = secret_shares.generateAllShares(noisyWeights, peers.size + 1, this.maxShareValue)
    await this.sendShares(peers, weightShares, round, trainingInformant)
    let shares = await this.receivedShares
    // add own share to list
    shares = shares.insert(0, weightShares.first())

    // PHASE 2 COMMUNICATION --> send partial sums to ready peers
    // calculating my personal partial sum from received shares that i will share with peers
    const mySum = aggregation.sum(shares)

    void this.sendPartialSums(mySum, peers)
    // after all partial sums are received, return list of partial sums to be aggregated
    let partials = await this.receivedPartialSums
    partials = partials.insert(0, mySum)

    trainingInformant.update({
      currentNumberOfParticipants: partials.size
    })

    // resets state
    this.receivedPartialSums = undefined
    this.receivedShares = undefined
    return partials
  }

  private async receiveShares (peers: Map<PeerID, PeerConnection>): Promise<List<WeightsContainer>> {
    const sharesPromises: Array<Promise<messages.Shares>> = Array.from(peers.values()).map(async peer => await waitMessage(peer, type.Shares))

    let receivedShares = List<WeightsContainer>()

    const sharesMessages = await Promise.all(sharesPromises)

    sharesMessages.forEach(message => {
      receivedShares = receivedShares.push(serialization.weights.decode(message.weights))
    })

    if (receivedShares.size < peers.size) {
      throw new Error('Not enough shares received')
    }

    return receivedShares
  }

  private async receivePartials (peers: Map<PeerID, PeerConnection>): Promise<List<WeightsContainer>> {
    const partialsPromises: Array<Promise<messages.PartialSums>> = Array.from(peers.values()).map(async peer => await waitMessage(peer, type.PartialSums))

    let receivedPartials = List<WeightsContainer>()

    const partialMessages = await Promise.all(partialsPromises)

    partialMessages.forEach(message => {
      receivedPartials = receivedPartials.push(serialization.weights.decode(message.partials))
    })

    if (receivedPartials.size < peers.size) {
      throw new Error('Not enough partials received')
    }

    return receivedPartials
  }

  /*
    handles received messages from signaling server
 */
  override clientHandle (peers: Map<PeerID, PeerConnection>): void {
    this.receivedShares = this.receiveShares(peers)
    this.receivedPartialSums = this.receivePartials(peers)
  }
}
