import { List, Set} from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'

import { serialization, TrainingInformant, Weights, aggregation } from '..'
import * as messages from '../messages'

import { Base } from './base'
import { URL } from 'url'

type PeerID = number

// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

const MINIMUM_PEERS = 3

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export abstract class DecentralizedGeneral extends Base {
  protected server?: isomorphic.WebSocket

  // list of peerIDs who the client will send messages to
  protected peers: Array<PeerID> = []
  protected peersLocked : boolean = false
  // list of weights received from other clients
  protected receivedWeights: List<Weights> = List()
  // list of partial sums received by client
  protected receivedPartialSums: List<Weights> = List()
  // the partial sum calculated by the client
  protected mySum: Weights = []
  // the ID of the client, set arbitrarily to 0 but gets set an actual value once it cues the signaling server
  // that it is ready to connect
  protected ID: number = 0

  /*
function to check if a given boolean condition is true, checks continuously until maxWait time is reached
 */
  protected async pauseUntil (condition: () => boolean): Promise<void>  {
    return await new Promise<void>((resolve, reject) => {
      const timeWas = new Date().getTime()
      const wait = setInterval(function () {
        if (condition()) {
          console.log('resolved after', new Date().getTime() - timeWas, 'ms')
          clearInterval(wait)
          resolve()
        } else if (new Date().getTime() - timeWas > MAX_WAIT_PER_ROUND) { // Timeout
          console.log('rejected after', new Date().getTime() - timeWas, 'ms')
          clearInterval(wait)
          reject(new Error('timeout'))
        }
      }, TICK)
    })
  }

  /*
  function behavior will change with peer 2 peer, sends message to its destination, currently through server
   */
  protected sendMessagetoPeer (message: unknown): void {
    if (this.server === undefined) {
      throw new Error("Undefined Server, can't send message")
    }
    this.server.send(message)
  }

  /*
  send message to server that client is ready
   */
  protected sendReadyMessage (round: number): void {
    // Broadcast our readiness
    const msg: messages.clientReadyMessage = { type: messages.messageType.clientReadyMessage, round: round }

    const encodedMsg = msgpack.encode(msg)
    if (this.server === undefined) {
      throw new Error('server undefined, could not connect peers')
    }
    this.server.send(encodedMsg)
  }

  /*
  creation of the websocket for the server, connection of client to that webSocket,
  deals with message reception from decentralized client perspective (messages received by client)
   */
  protected async connectServer (url: URL): Promise<isomorphic.WebSocket> {
    const ws = new isomorphic.WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = async (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }
      const msg = msgpack.decode(new Uint8Array(event.data))

      // check message type to choose correct action
      if (msg.type === messages.messageType.serverClientIDMessage) {
        // updated ID
        this.ID = msg.peerID
      } else if (msg.type === messages.messageType.serverReadyClients) {
        // updated connected peers
        if (!this.peersLocked) {
          this.peers = msg.peerList
          this.peersLocked = true
        }
      } else if (msg.type === messages.messageType.clientWeightsMessageServer) {
        // update received weights by one weights reception
        const weights = serialization.weights.decode(msg.weights)
        this.receivedWeights = this.receivedWeights.push(weights)
      } else if (msg.type === messages.messageType.clientPartialSumsMessageServer) {
        // update received partial sums by one partial sum
        const partials: Weights = serialization.weights.decode(msg.partials)
        this.receivedPartialSums = this.receivedPartialSums.push(partials)
      } else {
        throw new Error('Message Type Cannot Be Parsed')
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

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    //reset peer list at each round of training to make sure client waits for updated peerList from server
    this.peers = []
    this.receivedWeights = this.receivedWeights.clear()
    this.receivedPartialSums = this.receivedPartialSums.clear()
    this.peersLocked = false

    this.sendReadyMessage(round)

    // after peers are connected, send shares
    await this.pauseUntil(() => this.peers.length >= MINIMUM_PEERS)

    //send weights to all ready connected peers
    const finalWeights: List<Weights> = await this.sendAndReceiveWeights(updatedWeights, staleWeights, round, trainingInformant)
    const setWeights: Set<Weights> = finalWeights.toSet()
    return aggregation.averageWeights(setWeights)
  }

  abstract sendAndReceiveWeights(updatedWeights: Weights, staleWeights: Weights,
                                     round: number, trainingInformant: TrainingInformant): Promise<List<Weights>>
}
