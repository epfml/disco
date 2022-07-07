import { Map } from 'immutable'
import msgpack from 'msgpack-lite'
import WebSocket from 'ws'

import { TaskID } from 'discojs'

type PeerID = number
type epoch = number
type EncodedSignal = Buffer

type connectedPeerIDsMessage = PeerID[]
type ServerPeerMessage = [PeerID, EncodedSignal]
type ReadyMessage = [PeerID, epoch]

function isServerPeerMessage (msg: unknown): msg is ServerPeerMessage {
  if (!(msg instanceof Array)) {
    return false
  }
  if (msg.length !== 2) {
    return false
  }

  const [id, signal] = msg
  if (typeof id !== 'number') {
    return false
  }
  if (!Buffer.isBuffer(signal)) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: ServerPeerMessage = [id, signal]

  return true
}

function isReadyMessage (msg: unknown): msg is ReadyMessage {
  if (!(msg instanceof Array)) {
    return false
  }
  if (msg.length !== 2) {
    return false
  }

  const [id, epoch] = msg
  if (typeof id !== 'number' || typeof epoch!== 'number') {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: ReadyMessage = [id, epoch]

  return true
}

// TODO clean old clients

/* protocol
 *
 * when connecting a new client: sent the set of connected client
 * client answers with an offer for each client
 * each connected client then send an answer to the offer
 * tada! each peer are connected
 */

export class SignalingServer {
  private rooms: Map<TaskID, Map<PeerID, WebSocket>> = Map()
  private clientCounter: PeerID = 0
  private readyClients: PeerID[] = []
  private minConnected: number = 3

  handle (taskID: TaskID, ws: WebSocket): void {
    const peerID: PeerID = this.clientCounter++

    console.info('peer', peerID, 'joined', taskID)

    // const msg: connectedPeerIDsMessage
    //   this.rooms.get(taskID, Map<PeerID, WebSocket>())
    //     .keySeq()
    //     .toArray()

    // const oldRoom = this.rooms.get(taskID, Map<PeerID, WebSocket>())
    // this.rooms = this.rooms.set(taskID, oldRoom.set(peerID, ws))
    //
    // ws.send(msgpack.encode(msg), { binary: true })

    ws.on('message', (data: Buffer) => {
      try {
        const msg = msgpack.decode(data)
        if (isServerPeerMessage(msg)) { //connect peers?
          console.debug('peer', peerID, 'send message to', msg[0])

        const peerToSendTo = this.rooms
          .get(taskID, Map<PeerID, WebSocket>())
          .get(msg[0])
        if (peerToSendTo === undefined) {
          throw new Error('no such peer to send to')
        }
        const forwardMsg: ServerPeerMessage = [peerID, msg[1]]
        peerToSendTo.send(msgpack.encode(forwardMsg), { binary: true })
        }
        else if (isReadyMessage(msg)){
          this.readyClients.push(msg[0])
          if(this.readyClients.length>this.minConnected){
            //send peerIds to everyone in readyClients
            const connectedPeerIDs: connectedPeerIDsMessage = this.readyClients
            for(let peer of this.readyClients){
              const peerToSendTo = this.rooms.get(taskID, Map<PeerID, WebSocket>())
               .get(peer) //iterate through readyClient peerIDs
              if (peerToSendTo === undefined) {
                throw new Error('no such peer to send to')
                }
              peerToSendTo.send(msgpack.encode(connectedPeerIDs), { binary: true })
            }
          }
        }
      } catch (e) {
        console.error('when processing WebSocket message', e)
      }
    })
  }
}
