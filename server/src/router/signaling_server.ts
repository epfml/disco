import { Map } from 'immutable'
import msgpack from 'msgpack-lite'
import WebSocket from 'ws'

type TaskID = string
type PeerID = number
type EncodedSignal = Buffer

type OpeningMessage = PeerID[]
type PeerMessage = [PeerID, EncodedSignal]

function isPeerMessage (msg: unknown): msg is PeerMessage {
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
  const _: PeerMessage = [id, signal]

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

  handle (taskID: TaskID, ws: WebSocket): void {
    const peerID: PeerID = this.clientCounter++

    console.info('peer', peerID, 'joined', taskID)

    const msg: OpeningMessage =
    this.rooms.get(taskID, Map<PeerID, WebSocket>())
      .keySeq()
      .toArray()

    const oldRoom = this.rooms.get(taskID, Map<PeerID, WebSocket>())
    this.rooms = this.rooms.set(taskID, oldRoom.set(peerID, ws))

    ws.send(msgpack.encode(msg), { binary: true })

    ws.on('message', (data: Buffer) => {
      try {
        const peerMessage = msgpack.decode(data)
        if (!isPeerMessage(peerMessage)) {
          throw new Error('recv msg is not valid')
        }

        console.debug('peer', peerID, 'send message to', peerMessage[0])

        const peerToSendTo = this.rooms
          .get(taskID, Map<PeerID, WebSocket>())
          .get(peerMessage[0])
        if (peerToSendTo === undefined) {
          throw new Error('no such peer to send to')
        }

        const forwardMsg: PeerMessage = [peerID, peerMessage[1]]
        peerToSendTo.send(msgpack.encode(forwardMsg), { binary: true })
      } catch (e) {
        console.error(`when processing WebSocket message: ${e}`)
      }
    })
  }
}
