import { List } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'

import { serialization, TrainingInformant, Weights } from '..'
import * as messages from '../messages'

import { Base } from './base'
import { URL } from 'url'

type PeerID = number

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export abstract class DecentralizedGeneral extends Base {
  protected server?: isomorphic.WebSocket
  protected peers = List<PeerID>()
  protected receivedWeights = new Map <PeerID, Weights>()
  protected ID: number = 0

  protected peerMessageTemp (message: unknown): void {
    if (this.server === undefined) {
      throw new Error("Undefined Server, can't send message")
    }
    this.server.send(message)
  }

    protected sendReadyMessage (round: number): void {
    // Broadcast our readiness
    const msg: messages.clientReadyMessage = { type: messages.messageType.clientReadyMessage, round: round }

    const encodedMsg = msgpack.encode(msg)
    if (this.server === undefined) {
      throw new Error('server undefined, could not connect peers')
    }
    this.server.send(encodedMsg)
  }

  protected async connectServer (url: URL): Promise<isomorphic.WebSocket> {
    const ws = new isomorphic.WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = async (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }
      const msg = msgpack.decode(new Uint8Array(event.data))

      if (msg.type === messages.messageType.serverClientIDMessage) {
        this.ID = msg.peerID
      } else if (msg.type === messages.messageType.serverConnectedClients) { // who to connect to
        this.peers = msg.peerList
      } else if (msg.type === messages.messageType.clientWeightsMessageServer) { // weights message
        const weights = serialization.weights.decode(msg.weights)
        this.receivedWeights.set(msg.peerID, weights)
      } else {
        throw new Error('Message Type Incorrect')
      }
    }
    return await new Promise((resolve, reject) => {
      ws.onerror = (err: isomorphic.ErrorEvent) =>
        reject(new Error(`connecting server: ${err.message}`))
      ws.onopen = () => resolve(ws)
    })
  }

  /**
   * Initialize the connection to the peers and to the other nodes.
   */
  async connect (): Promise<void> {
    const serverURL = new URL('', this.url.href)
    switch (this.url.protocol) {
      case 'http:':
        serverURL.protocol = 'ws:'
        break
      case 'https:':
        serverURL.protocol = 'wss:'
        break
      default:
        throw new Error(`unknown protocol: ${this.url.protocol}`)
    }
    serverURL.pathname += `deai/${this.task.taskID}`

    this.server = await this.connectServer(serverURL)
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect (): Promise<void> {
    // this.peers.forEach((peer) => peer.destroy())
    // this.peers = Map()

    this.server?.close()
    this.server = undefined
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }

  // abstract peerOnData (peer: SimplePeer.Instance, peerID: number, data: any): void

  abstract onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights|undefined >

  public getPeerIDs (): List<PeerID> {
    return this.peers.keySeq().toList()
  }
}
