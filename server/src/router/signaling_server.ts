import { Map, List, Set } from 'immutable'
import msgpack from 'msgpack-lite'
import WebSocket from 'ws'

import { TaskID, serialization} from 'discojs'

type PeerID = number
type epoch = number
type EncodedSignal = Uint8Array
type serverClientIDMessage = number

type clientReadyMessage = [PeerID: PeerID, round:number] //client is ready
type clientWeightsMessageServer = [PeerID: number, weights: serialization.weights.Encoded] //client weights
type clientPartialSumsMessageServer = [PeerID, EncodedSignal] //client partial sum
type serverConnectedClientsMessage = List<PeerID> //server send to client who to connect to

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

export function isServerConnectedClients (data: unknown): data is serverConnectedClientsMessage {
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
  const _: serverConnectedClientsMessage = List<PeerID>()
  return true
}

export class SignalingServer {
  private readyClients: Map<PeerID, WebSocket> = Map()
  private clientCounter: PeerID = 0
  // private readyClients: List<PeerID> = List()
  private minConnected: number = 3

  handle (taskID: TaskID, ws: WebSocket): void {
    const peerID: PeerID = this.clientCounter++
    this.readyClients = this.readyClients.set(peerID, ws)
    let msg: serverClientIDMessage = peerID
    console.info('peer', peerID, 'joined', taskID)

    // const msg: connectedPeerIDsMessage =
    //   this.rooms.get(PeerID, WebSocket>())
    //     .keySeq()
    //     .toArray()
    //
    // const oldRoom = this.rooms.get(taskID, Map<PeerID, WebSocket>())
    // this.rooms = this.rooms.set(peerID, ws)

    ws.send(msgpack.encode(msg), { binary: true })

    ws.on('message', (data: Buffer) => {
      try {
        const msg = msgpack.decode(data)
        if (isClientWeightsMessageServer(msg)) {
          console.debug('peer', peerID, 'send message to', msg[0])
          const forwardMsg: clientWeightsMessageServer = [peerID, msg[1]]
          for(let client of this.readyClients.values()){
            client.send(forwardMsg)
          }
        //   this.rooms.forEach(client, msg[1])
        // const peerToSendTo = this.rooms
        //   .get(taskID, Map<PeerID, WebSocket>())
        //   .get(msg[0])
        // if (peerToSendTo === undefined) {
        //   throw new Error('no such peer to send to')
        // }
        // peerToSendTo.send(msgpack.encode(forwardMsg), { binary: true })
        }
        else if (isClientReadyMessage(msg)){
          this.readyClients.set(peerID, ws)
          console.log('readyClients', this.readyClients.keys())
          if(this.readyClients.size>this.minConnected){
            //send peerIds to everyone in readyClients
            const connectedPeerIDs: List<number> = this.readyClients.keySeq().toList()
            for(let peer of this.readyClients.values()){
              peer.send(msgpack.encode(connectedPeerIDs), { binary: true })
            }
          }
        }
        // else if (is sum){
        //
        // }
      } catch (e) {
        console.error('when processing WebSocket message', e)
      }
    })
  }
}
