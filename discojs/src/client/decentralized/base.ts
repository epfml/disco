import { List } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import * as nodeUrl from 'url'
import { Task } from '@/task'

import { TrainingInformant, Weights, aggregation, privacy } from '../..'
import { Base as ClientBase } from '../base'
import * as messages from './messages'
import { PeerID } from './types'

// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

/**
 * Abstract class for decentralized clients, executes onRoundEndCommunication as well as connecting
 * to the signaling server
 */
export abstract class Base extends ClientBase {
  protected minimumReadyPeers: number
  protected maxShareValue: number
  constructor (
    public readonly url: URL,
    public readonly task: Task
  ) {
    super(url, task)
    this.minimumReadyPeers = this.task.trainingInformation?.minimumReadyPeers ?? 3
    this.maxShareValue = this.task.trainingInformation?.maxShareValue ?? 100
  }

  protected server?: isomorphic.WebSocket
  // list of peerIDs who the client will send messages to
  protected peers: PeerID[] = []
  protected peersLocked: boolean = false
  // the ID of the client, set arbitrarily to 0 but gets set an actual value once it cues the signaling server
  // that it is ready to connect
  protected ID: number = 0

  /*
function to check if a given boolean condition is true, checks continuously until maxWait time is reached
 */
  protected async pauseUntil (condition: () => boolean): Promise<void> {
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
    const msg: messages.clientReadyMessage = {
      type: messages.type.clientReadyMessage,
      round: round,
      peerID: this.ID,
      task: this.task.taskID
    }

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
    const WS = typeof window !== 'undefined' ? window.WebSocket : isomorphic.WebSocket
    const ws: WebSocket = new WS(url)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = async (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }
      const msg: unknown = msgpack.decode(new Uint8Array(event.data))

      if (!messages.isMessage(msg)) {
        console.error('invalid message received:', msg)
        return
      }

      // check message type to choose correct action
      if (msg.type === messages.type.serverClientIDMessage) {
        // updated ID
        this.ID = msg.peerID
      } else if (msg.type === messages.type.serverReadyClients) {
        // updated connected peers
        if (!this.peersLocked) {
          this.peers = msg.peerList
          this.peersLocked = true
        }
      } else if (msg.type === messages.type.clientConnected) {
        this.connected = true
      } else {
        this.clientHandle(msg)
      }
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: isomorphic.ErrorEvent) =>
        reject(new Error(`connecting server: ${err.message}`)) // eslint-disable-line @typescript-eslint/restrict-template-expressions
      ws.onopen = () => resolve(ws)
    })
  }

  /**
   * Initialize the connection to the peers and to the other nodes.
   */
  async connect (): Promise<void> {
    const URL = typeof window !== 'undefined' ? window.URL : nodeUrl.URL
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

    await this.pauseUntil(() => this.connected)
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect (): Promise<void> {
    // this.peers.forEach((peer) => peer.destroy())
    // this.peers = Map()

    this.server?.close()
    this.server = undefined
    this.connected = false
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    try {
      // reset peer list at each round of training to make sure client waits for updated peerList from server
      this.peers = []

      this.peersLocked = false

      // centralized phase of communication --> client tells server that they have finished a local round and are ready to aggregate
      this.sendReadyMessage(round)

      // wait for peers to be connected before sending any update information
      await this.pauseUntil(() => this.peers.length >= this.minimumReadyPeers)

      // Apply clipping and DP to updates that will be sent
      const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
      // send weights to all ready connected peers
      const finalWeights: List<Weights> = await this.sendAndReceiveWeights(noisyWeights, round, trainingInformant)
      return aggregation.averageWeights(finalWeights)
    } catch (Error) {
      console.log('Timeout Error Reported, training will continue')
      return updatedWeights
    }
  }

  abstract sendAndReceiveWeights (noisyWeights: Weights,
    round: number, trainingInformant: TrainingInformant): Promise<List<Weights>>

  abstract clientHandle (msg: messages.PeerMessage): void
}
