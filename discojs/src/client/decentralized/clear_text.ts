import { List, Set } from 'immutable'
import { PeerID } from './types'

import { serialization, TrainingInformant, Weights } from '../..'
import { Base } from './base'
import * as messages from './messages'
import { pauseUntil } from './utils'

/**
 * Decentralized client that does not utilize secure aggregation, but sends model updates in clear text
 */
export class ClearText extends Base {
  // list of weights received from other clients
  private receivedWeights: List<Weights> = List()

  override async sendAndReceiveWeights (
    peers: Set<PeerID>,
    noisyWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<List<Weights>> {
    // prepare weights to send to peers
    const weightsToSend = await serialization.weights.encode(noisyWeights)

    // PHASE 1 COMMUNICATION --> create weights message and send to all peers (only one phase of communication for clear_text)

    // reset received fields at beginning of each round
    this.receivedWeights = List()

    // create weights message and send to all peers
    peers.forEach((peer) =>
      this.sendMessagetoPeer({
        type: messages.type.Weights,
        peer: peer,
        weights: weightsToSend
      })
    )

    // wait to receive all weights from peers
    await pauseUntil(() => this.receivedWeights.size >= peers.size)
    trainingInformant.update({
      currentNumberOfParticipants: this.receivedWeights.size
    })

    return this.receivedWeights
  }

  /*
handles received messages from signaling server
 */
  override clientHandle (msg: messages.PeerMessage): void {
    if (msg.type === messages.type.Weights) {
      // update received weights by one weights reception
      const weights = serialization.weights.decode(msg.weights)
      this.receivedWeights = this.receivedWeights.push(weights)
    } else {
      throw new Error(`unexpected message type: ${msg.type}`)
    }
  }
}
