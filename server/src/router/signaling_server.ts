import { Map } from 'immutable'
import msgpack from 'msgpack-lite'
import WebSocket from 'ws'

import { TaskID, messages } from 'discojs'
import * as Buffer from 'buffer'

type PeerID = number

export class SignalingServer {
  private readyClients: Map<PeerID, WebSocket> = Map()
  private clientCounter: PeerID = 0
  private readonly minConnected: number = 3

  handle (taskID: TaskID, ws: WebSocket): void {
    const peerID: PeerID = this.clientCounter++
    this.readyClients = this.readyClients.set(peerID, ws)
    const msg: messages.serverClientIDMessage = { type: messages.messageType.serverClientIDMessage, peerID: peerID }
    console.info('peer', peerID, 'joined', taskID)

    ws.send(msgpack.encode(msg), { binary: true })

    ws.on('message', (data: Buffer) => {
      try {
        const msg = msgpack.decode(data)
        if (msg.type === messages.messageType.clientWeightsMessageServer) {
          const forwardMsg: messages.clientWeightsMessageServer = { type: messages.messageType.clientWeightsMessageServer,
            peerID: msg.peerID, weights: msg.weights, destination: msg.destination }
          const encodedMsg: Buffer = msgpack.encode(forwardMsg)

          //this part can be simplified if we figure out how ot iterate directly through this.peers in the client
          const peerIDToSend = this.readyClients.keySeq().get(msg.destination)
          if (peerIDToSend===undefined){
            throw new Error ("Cannot send weights to that peer, it is undefined")
          }
          this.readyClients.get(peerIDToSend)?.send(encodedMsg)
          //
        } else if (msg.type === messages.messageType.clientReadyMessage) {
          this.readyClients = this.readyClients.set(peerID, ws)
          if (this.readyClients.size >= this.minConnected) {
            // send peerIds to everyone in readyClients
            const connectedPeerIDs: messages.serverConnectedClients = { type: messages.messageType.serverConnectedClients, peerList: this.readyClients.keySeq().toList() }
            for (const peer of this.readyClients.values()) {
              peer.send(msgpack.encode(connectedPeerIDs))
            }
          }
        }
      } catch (e) {
        console.error('when processing WebSocket message', e)
      }
    })
  }
}
