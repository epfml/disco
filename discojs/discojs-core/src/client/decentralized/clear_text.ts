import { List, Map } from 'immutable'

import { serialization, TrainingInformant, WeightsContainer } from '../..'
import { Base } from './base'
import * as messages from './messages'
import { type } from '../messages'
import { PeerID } from './types'
import { PeerConnection, waitMessage } from '../event_connection'

/**
 * Decentralized client that does not utilize secure aggregation, but sends model updates in clear text
 */
export class ClearText extends Base {
  // list of weights received from other clients
  private receivedWeights?: Promise<List<WeightsContainer>>

  override async sendAndReceiveWeights (
    peers: Map<PeerID, PeerConnection>,
    noisyWeights: WeightsContainer,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<List<WeightsContainer>> {
    if (!this.receivedWeights) {
      throw new Error('no promise setup for receiving weights')
    }

    // PHASE 1 COMMUNICATION --> create weights message and send to all peers (only one phase of communication for clear_text)

    // send weights asynchronously
    serialization.weights.encode(noisyWeights).then((encodedWeights) => {
      // create weights message and send to all peers
      peers.forEach((peer, id) =>
        this.sendMessagetoPeer(peer, {
          type: type.Weights,
          peer: id,
          weights: encodedWeights
        }))
    }).catch(() => {
      throw new Error('error while sending weights')
    })

    // wait to receive all weights from peers
    const weights = await this.receivedWeights

    trainingInformant.update({
      currentNumberOfParticipants: weights.size + 1
    })

    // add our own weights and reset state
    const ret = weights.push(noisyWeights)
    this.receivedWeights = undefined
    return ret
  }

  private async receiveWeights (peers: Map<PeerID, PeerConnection>): Promise<List<WeightsContainer>> {
    console.debug('beginning of receiveWeights')
    const waitWeights: Array<Promise<messages.Weights>> = Array.from(peers.values()).map(async peer => {
      return await waitMessage(peer, type.Weights)
    })

    let receivedWeights = List<WeightsContainer>()
    await (await Promise.allSettled(waitWeights)).forEach((message) => {
      if (message.status === 'fulfilled') {
        receivedWeights = receivedWeights.push(serialization.weights.decode(message.value.weights))
      }
    })

    if (receivedWeights.size < peers.size) {
      throw new Error('not enough peer weights received')
    }

    return receivedWeights
  }

  /*
    handles received messages from signaling server
 */
  override clientHandle (peers: Map<PeerID, PeerConnection>): void {
    this.receivedWeights = this.receiveWeights(peers)
  }
}
