import { List } from 'immutable'
import msgpack from 'msgpack-lite'

import { serialization, TrainingInformant, Weights } from '..'
import { DecentralizedBase } from './decentralizedBase'
import * as messages from '../messages'

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class DecentralizedClearText extends DecentralizedBase {
    // list of weights received from other clients
  protected receivedWeights: List<Weights> = List()

  override async sendAndReceiveWeights (noisyWeights: Weights,
    round: number, trainingInformant: TrainingInformant): Promise<List<Weights>> {
    // prepare weights to send to peers
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

  override clientHandle(msg: any): void{
    if (msg.type === messages.messageType.clientWeightsMessageServer) {
        // update received weights by one weights reception
        const weights = serialization.weights.decode(msg.weights)
        this.receivedWeights = this.receivedWeights.push(weights)
  }
    else{
    throw new Error('Unexpected Message Type')}
  }

  override resetFields(): void{
    this.peers = []
    this.receivedWeights = this.receivedWeights.clear()
    this.peersLocked = false
  }
}
