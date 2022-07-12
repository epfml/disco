import { Map, List, Set } from 'immutable'
import msgpack from 'msgpack-lite'
import WebSocket from 'ws'

import { TaskID, serialization, messages} from 'discojs'
import * as Buffer from "buffer";

type PeerID = number
type epoch = number
type EncodedSignal = Uint8Array

export class SignalingServer {
  private readyClients: Map<PeerID, WebSocket> = Map()
  private clientCounter: PeerID = 0
  private minConnected: number = 2

  handle (taskID: TaskID, ws: WebSocket): void {
    const peerID: PeerID = this.clientCounter++
    this.readyClients = this.readyClients.set(peerID, ws)
    let msg: messages.serverClientIDMessage = {type: messages.messageType.serverClientIDMessage, peerID: peerID}
    console.info('peer', peerID, 'joined', taskID)

    ws.send(msgpack.encode(msg), { binary: true })

    ws.on('message', (data: Buffer) => {
      try {
        const msg = msgpack.decode(data)
        if (msg.type === messages.messageType.clientWeightsMessageServer) {
          console.log('server has received weights')
          const forwardMsg: messages.clientWeightsMessageServer = {type: messages.messageType.clientWeightsMessageServer, peerID: msg.peerID, weights: msg.weights}
          const encodedMsg: Buffer = msgpack.encode(forwardMsg)
          for(let client of this.readyClients.values()){
            client.send(encodedMsg)
          }
        }
        else if (msg.type === messages.messageType.clientReadyMessage){
          this.readyClients.set(peerID, ws)
          if(this.readyClients.size>=this.minConnected){
            //send peerIds to everyone in readyClients
            const connectedPeerIDs: messages.serverConnectedClients = {type: messages.messageType.serverConnectedClients, peerList: this.readyClients.keySeq().toList()}
            for(let peer of this.readyClients.values()){
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
