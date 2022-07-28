import { List } from 'immutable'
import msgpack from 'msgpack-lite'

import { serialization, TrainingInformant, Weights } from '../..'
import { Base } from './base'
import * as messages from './messages'

/**
 * Decentralized client that does not utilize secure aggregation, but sends model updates in clear text
 */
export class ClearText extends Base {
  // list of weights received from other clients
  protected receivedWeights: List<Weights> = List()

  override async sendAndReceiveWeights (
    noisyWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<List<Weights>> {
    // reset received fields at beginning of each round
    this.receivedWeights = this.receivedWeights.clear()
    // prepare weights to send to peers
    const weightsToSend = await serialization.weights.encode(noisyWeights)

    if (this.server === undefined) {
      throw new Error('server undefined so we cannot send weights through it')
    }
    // PHASE 1 COMMUNICATION --> create weights message and send to all peers (only one phase of communication for clear_text)
    for (let i = 0; i < this.peers.length; i++) {
      const msg: messages.clientWeightsMessageServer = {
        type: messages.messageType.clientWeightsMessageServer,
        peerID: this.ID,
        weights: weightsToSend,
        destination: this.peers[i]
      }
      const encodedMsg = msgpack.encode(msg)
      this.sendMessagetoPeer(encodedMsg)
    }

    // wait to receive all weights from peers
    await this.pauseUntil(() => this.receivedWeights.size >= this.peers.length)
    return this.receivedWeights
  }

  /*
  checks if message contains weights from a peer
   */
  private instanceOfClientWeightsMessageServer (msg: messages.messageGeneral): msg is messages.clientWeightsMessageServer {
    return msg.type === messages.messageType.clientWeightsMessageServer
  }

  /*
handles received messages from signaling server
 */
  override clientHandle (msg: messages.messageGeneral): void {
    if (this.instanceOfClientWeightsMessageServer(msg)) {
      // update received weights by one weights reception
      const weights = serialization.weights.decode(msg.weights)
      this.receivedWeights = this.receivedWeights.push(weights)
    } else {
      throw new Error('Unexpected Message Type')
    }
  }
}
