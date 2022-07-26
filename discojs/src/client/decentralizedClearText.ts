import { List, Set} from 'immutable'
import msgpack from 'msgpack-lite'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'
import { DecentralizedBase } from './decentralizedBase'
import * as messages from '../messages'

const MINIMUM_PEERS = 3

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class DecentralizedClearText extends DecentralizedBase {
    override async sendAndReceiveWeights(updatedWeights: Weights, staleWeights: Weights,
                                     round: number, trainingInformant: TrainingInformant): Promise<List<Weights>>{
    // prepare weights to send to peers
    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    const weightsToSend = await serialization.weights.encode(noisyWeights)

    if (this.server === undefined) {
      throw new Error('server undefined so we cannot send weights through it')
    }
    // create weights message and send to all peers
    for (let peerDest = 0; peerDest < this.peers.length; peerDest++) {
      const msg: messages.clientWeightsMessageServer = {
        type: messages.messageType.clientWeightsMessageServer,
        peerID: this.ID,
        weights: weightsToSend,
        destination: peerDest
      }
      const encodedMsg = msgpack.encode(msg)
      this.sendMessagetoPeer(encodedMsg)
    }

    // wait to receive all weights from peers
    await this.pauseUntil(() => this.receivedWeights.size >= this.peers.length)
    return this.receivedWeights
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }
}
