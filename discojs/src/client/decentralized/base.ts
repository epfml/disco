import { List, Set } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import * as nodeUrl from 'url'
import { Task } from '@/task'

import { TrainingInformant, Weights, aggregation, privacy } from '../..'
import { Base as ClientBase } from '../base'
import * as messages from './messages'
import { PeerID } from './types'
import { pauseUntil } from './utils'

/**
 * Abstract class for decentralized clients, executes onRoundEndCommunication as well as connecting
 * to the signaling server
 */
export abstract class Base extends ClientBase {
  private readonly minimumReadyPeers: number

  private server?: isomorphic.WebSocket

  // list of peerIDs who the client will send messages to
  private peers?: Set<PeerID>

  // ID of the client, got from the server
  private ID?: PeerID

  constructor (
    public readonly url: URL,
    public readonly task: Task
  ) {
    super(url, task)
    this.minimumReadyPeers = this.task.trainingInformation?.minimumReadyPeers ?? 3
  }

  protected sendMessagetoPeer (msg: messages.PeerMessage): void {
    if (this.ID === msg.peer) {
      throw new Error('sending message to itself')
    }

    console.debug(this.ID, `sends message to peer ${msg.peer}:`, msg)

    if (this.server === undefined) {
      throw new Error("Undefined Server, can't send message")
    }

    this.server.send(msgpack.encode(msg))
  }

  // send message to server that client is ready
  private async waitForPeers (round: number): Promise<Set<PeerID>> {
    console.debug(this.ID, 'is ready for round', round)

    // clean old round
    this.peers = undefined

    // Broadcast our readiness
    const msg: messages.PeerIsReady = { type: messages.type.PeerIsReady }

    if (this.server === undefined) {
      throw new Error('server undefined, could not connect peers')
    }
    this.server.send(msgpack.encode(msg))

    // wait for peers to be connected before sending any update information
    await pauseUntil(() => (this.peers?.size ?? 0) + 1 >= this.minimumReadyPeers)

    const ret = Set(this.peers ?? [])
    console.debug(this.ID, `got peers for round ${round}:`, ret.toJS())
    return ret
  }

  /*
  creation of the websocket for the server, connection of client to that webSocket,
  deals with message reception from decentralized client perspective (messages received by client)
   */
  private async connectServer (url: URL): Promise<isomorphic.WebSocket> {
    const WS = typeof window !== 'undefined' ? window.WebSocket : isomorphic.WebSocket
    const ws: WebSocket = new WS(url)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }

      const msg = msgpack.decode(new Uint8Array(event.data))
      console.debug(this.ID, 'received message from server:', msg)
      if (
        !messages.isMessageFromServer(msg) &&
        !messages.isPeerMessage(msg) // TODO rm when fully distributed
      ) {
        throw new Error(`invalid message received: ${JSON.stringify(msg)}`)
      }

      switch (msg.type) {
        case messages.type.PeerID:
          if (this.ID !== undefined) {
            throw new Error('got ID from server but was already received')
          }
          this.ID = msg.id
          console.debug(this.ID, 'got own id from server')
          break
        case messages.type.PeersForRound: {
          const peers = Set(msg.peers)
          if (this.ID !== undefined && peers.has(this.ID)) {
            throw new Error('received peer list contains our own id')
          }

          if (this.peers !== undefined) {
            throw new Error('got new peer list from server but was already received for this round')
          }
          this.peers = peers

          console.debug(this.ID, 'got peers for round:', peers.toJS())
          break
        }
        case messages.type.clientConnected:
          this.connected = true
          break
        default:
          console.debug(this.ID, 'handles message in subclass')
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

    await pauseUntil(() => this.connected)

    console.debug(this.ID, 'server connected')
  }

  // disconnect from server & peers
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
      const peers = await this.waitForPeers(round)

      // centralized phase of communication --> client tells server that they have finished a local round and are ready to aggregate

      // Apply clipping and DP to updates that will be sent
      const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
      // send weights to all ready connected peers
      const finalWeights = await this.sendAndReceiveWeights(peers, noisyWeights, round, trainingInformant)
      console.debug(this.ID, 'sent and received weights at round', round)
      return aggregation.averageWeights(finalWeights)
    } catch (e) {
      let msg = `errored on round ${round}`
      if (e instanceof Error) { msg += `: ${e.message}` }
      console.warn(this.ID, msg)

      return updatedWeights
    }
  }

  abstract sendAndReceiveWeights (
    peers: Set<PeerID>,
    noisyWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<List<Weights>>

  abstract clientHandle (msg: messages.PeerMessage): void
}
