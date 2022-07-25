import { Map } from 'immutable'
import msgpack from 'msgpack-lite'
import WebSocket from 'ws'

import { TaskID, messages } from 'discojs'
import * as Buffer from 'buffer'

type PeerID = number

export class SignalingServer {
  // maps peerIDs to their respective websockets so peers can be sent messages by their IDs
  private readyClients: Map<PeerID, WebSocket> = Map()
  // increments with addition of every client, server keeps track of clients with this and tells them their ID
  private clientCounter: PeerID = 0
  // parameter of DisCo, should be set by client
  private readonly minConnected: number = 3

  handle (taskID: TaskID, ws: WebSocket): void {
    const peerID: PeerID = this.clientCounter++
    this.readyClients = this.readyClients.set(peerID, ws)
    // send peerID message
    const msg: messages.serverClientIDMessage = { type: messages.messageType.serverClientIDMessage, peerID: peerID }
    console.info('peer', peerID, 'joined', taskID)

    ws.send(msgpack.encode(msg), { binary: true })

    // how the server responds to messages
    ws.on('message', (data: Buffer) => {
      try {
        const msg = msgpack.decode(data)
        if (msg.type === messages.messageType.clientWeightsMessageServer) {
          const forwardMsg: messages.clientWeightsMessageServer = {
            type: messages.messageType.clientWeightsMessageServer,
            peerID: msg.peerID,
            weights: msg.weights,
            destination: msg.destination
          }
          const encodedMsg: Buffer = msgpack.encode(forwardMsg)

          // this part can be simplified if we figure out how ot iterate directly through this.peers in the client
          // the msg.destination is the index of the readyClients, NOT the client ID itself
          const peerIDToSend = this.readyClients.keySeq().get(msg.destination)
          if (peerIDToSend === undefined) {
            throw new Error('Cannot send weights to that peer, it is undefined')
          }
          // sends message it received to destination
          this.readyClients.get(peerIDToSend)?.send(encodedMsg)
        } else if (msg.type === messages.messageType.clientReadyMessage) {
          this.readyClients = this.readyClients.set(peerID, ws)
          // if enough clients are connected, server shares who is connected
          if (this.readyClients.size >= this.minConnected) {
            const connectedPeerIDs: messages.serverConnectedClients = { type: messages.messageType.serverConnectedClients, peerList: this.readyClients.keySeq().toList() }
            for (const peer of this.readyClients.values()) {
              // send peerIds to everyone in readyClients
              peer.send(msgpack.encode(connectedPeerIDs))
            }
          }
        } else if (msg.type === messages.messageType.clientPartialSumsMessageServer) {
          const forwardMsg: messages.clientPartialSumsMessageServer = {
            type: messages.messageType.clientPartialSumsMessageServer,
            peerID: msg.peerID,
            partials: msg.partials,
            destination: msg.destination
          }
          const encodedMsg: Buffer = msgpack.encode(forwardMsg)

          // this part can be simplified if we figure out how ot iterate directly through this.peers in the client
          const peerIDToSend = this.readyClients.keySeq().get(msg.destination)
          if (peerIDToSend === undefined) {
            throw new Error('Cannot send weights to that peer, it is undefined')
          }
          const peerSocket = this.readyClients.get(peerIDToSend)
          if (peerSocket === undefined) {
            throw new Error('Cannot send weights to that peer, it is undefined')
          }
          peerSocket.send(encodedMsg)
          //
        }
      } catch (e) {
        console.error('when processing WebSocket message', e)
      }
    })
  }
}
