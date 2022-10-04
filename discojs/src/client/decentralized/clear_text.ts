import { List, Map } from 'immutable'

import { serialization, TrainingInformant, WeightsContainer } from '../..'
import { Base } from './base'
import * as messages from './messages'
import { Peer } from './peer'
import { pauseUntil } from './utils'
import { PeerID } from './types'

/**
 * Decentralized client that does not utilize secure aggregation, but sends model updates in clear text
 */
export class ClearText extends Base {
  // list of weights received from other clients
  private receivedWeights = List<WeightsContainer>()

  override async sendAndReceiveWeights (
    peers: Map<PeerID, Peer>,
    noisyWeights: WeightsContainer,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<List<WeightsContainer>> {
    // prepare weights to send to peers
    const weightsToSend = await serialization.weights.encode(noisyWeights)

    // PHASE 1 COMMUNICATION --> create weights message and send to all peers (only one phase of communication for clear_text)

    // create weights message and send to all peers
    peers.forEach((peer, id) =>
      this.sendMessagetoPeer(peer, {
        type: messages.type.Weights,
        peer: id,
        weights: weightsToSend
      })
    )

    // wait to receive all weights from peers
    await pauseUntil(() => this.receivedWeights.size >= peers.size)
    trainingInformant.update({
      currentNumberOfParticipants: this.receivedWeights.size + 1
    })

    // add our own weights and reset state
    const ret = this.receivedWeights.push(noisyWeights)
    this.receivedWeights = List()
    return ret
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
