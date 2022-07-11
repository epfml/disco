import { List, Map, Set } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
// import { URL } from 'url'

import { serialization, TrainingInformant, Weights } from '..'

import { Base } from './base'
import { URL } from 'url'

// TODO take it from the server sources
type PeerID = number
type EncodedSignal = Uint8Array

type serverClientIDMessage = number
type clientReadyMessage = [PeerID: PeerID, round:number] //client is ready
type clientWeightsMessageServer = [PeerID: number, weights: serialization.weights.Encoded] //client weights
type clientPartialSumsMessageServer = [PeerID, EncodedSignal] //client partial sum
type serverConnectedClients = List<PeerID> //server send to client who to connect to

export function isServerClientIDMessage(data:unknown): data is serverClientIDMessage{
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('PeerID'))) {
    return false
  }
  const { PeerID} = data as Record<'PeerID', unknown>

  if (
    typeof PeerID !== 'number'
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: serverClientIDMessage = PeerID
  return true
}

export function isClientReadyMessage (data: unknown): data is clientReadyMessage {
if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('PeerID', 'round'))) {
    return false
  }
  const { PeerID, round } = data as Record<'PeerID' | 'round', unknown>

  if (
    typeof PeerID !== 'number' ||
    typeof round !== 'number'
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: clientReadyMessage = [PeerID, round]
  return true
}

export function isClientWeightsMessageServer (data: unknown): data is clientWeightsMessageServer {
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('PeerID', 'weights'))) {
    return false
  }
  const { PeerID, weights } = data as Record<'PeerID' | 'weights', unknown>

  if (
    typeof PeerID !== 'number' ||
    !serialization.weights.isEncoded(weights)
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: clientWeightsMessageServer = [PeerID, weights]

  return true
}

export function isClientPartialSumsMessageServer (data: unknown): data is clientPartialSumsMessageServer {
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('PeerID', 'EncodedSignal'))) {
    return false
  }
  const { PeerID, EncodedSignal } = data as Record<'PeerID' | 'EncodedSignal', unknown>

  if (
    typeof PeerID !== 'number' ||
    !(EncodedSignal instanceof Uint8Array)
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: clientPartialSumsMessageServer = [PeerID, EncodedSignal]
  return true
}

export function isServerConnectedClientsMessage (data: unknown): data is serverConnectedClients {
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('PeerID'))) {
    return false
  }
  const { PeerID} = data as Record<'PeerID', unknown>

  if (
    typeof PeerID !== 'number'
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: serverConnectedClients = List<PeerID>()
  return true
}

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export abstract class DecentralizedGeneral extends Base {
  protected server?: isomorphic.WebSocket
  protected peers = List<PeerID>()
  protected readonly receivedWeights = Map<PeerID, List<Weights | undefined>>()
  protected ID: number = 0

  protected async peerMessageTemp(message: unknown){
    if (this.server === undefined){
      throw new Error("Undefined Server, can't send message")
    }
    this.server.send(message)
  }

  protected async connectServer (url: URL): Promise<isomorphic.WebSocket> {
    const ws = new isomorphic.WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = async (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }
      const msg: unknown = msgpack.decode(new Uint8Array(event.data))

      if (isServerClientIDMessage(msg)){
        this.ID = msg
      }
      else if (isServerConnectedClientsMessage(msg)) { // who to connect to
        this.peers = msg
      } else if (isClientWeightsMessageServer(msg)) { // weights message
        const [peerID, encodedSignal] = msg
        const signal = msgpack.decode(encodedSignal)
        this.receivedWeights.set(peerID, signal)
      }
       else {
        throw new Error('send sent an invalid msg')
      }
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: isomorphic.ErrorEvent) =>
        reject(new Error(`connecting server: ${err.message}`))
      ws.onopen = () => resolve(ws)
    })
  }

  // async connectNewPeer (peerID: PeerID, initiator: boolean): Promise<SimplePeer.Instance> {
  //   console.debug('connect new peer with initiator: ', initiator)
  //
  //   // only available on node
  //   const wrtc = await import('wrtc')
  //     .then((m) => m.default)
  //     .catch(() => undefined)
  //
  //   const peer = new SimplePeer({
  //     initiator,
  //     wrtc,
  //     config: {
  //       iceServers: List(SimplePeer.config.iceServers)
  //         /* .push({
  //           urls: 'turn:34.77.172.69:3478',
  //           credential: 'deai',
  //           username: 'deai'
  //         }) */
  //         .toArray()
  //     }
  //   })
  //
  //   peer.on('signal', (signal: unknown) => {
  //     console.debug('local', peerID, 'is signaling', signal)
  //
  //     if (this.server === undefined) {
  //       console.warn('server closed but received a signal')
  //       return
  //     }
  //
  //     const msg: ServerPeerMessage = [peerID, msgpack.encode(signal)]
  //     this.server.send(msgpack.encode(msg))
  //   })
  //
  //   peer.on('data', (data) => { this.peerOnData(peer, peerID, data) })
  //
  //   peer.on('connect', () => console.info('connected to peer', peerID))
  //
  //   // TODO better error handling
  //   peer.on('error', (err) => { throw err })
  //
  //   return peer
  // }

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
