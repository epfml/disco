import { Map } from 'immutable'
import msgpack from 'msgpack-lite'
import WebSocket from 'ws'

import { TaskID, messages } from 'discojs'
import * as Buffer from 'buffer'

type PeerID = number

export class SignalingServer {
  // maps peerIDs to their respective websockets so peers can be sent messages by their IDs
  private readyClientsBuffer: PeerID[] = []
  private clients: Map<PeerID, WebSocket> = Map()
  // increments with addition of every client, server keeps track of clients with this and tells them their ID
  private clientCounter: PeerID = 0
  // parameter of DisCo, should be set by client
  private readonly minConnected: number = 3

  handle (taskID: TaskID, ws: WebSocket): void {
    const peerID: PeerID = this.clientCounter++
    this.clients = this.clients.set(peerID, ws)
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

          // sends message it received to destination
          this.clients.get(msg.destination)?.send(encodedMsg)
        }
        else if (msg.type === messages.messageType.clientSharesMessageServer) {
          const forwardMsg: messages.clientSharesMessageServer = {
            type: messages.messageType.clientSharesMessageServer,
            peerID: msg.peerID,
            weights: msg.weights,
            destination: msg.destination
          }
          const encodedMsg: Buffer = msgpack.encode(forwardMsg)

          // sends message it received to destination
          this.clients.get(msg.destination)?.send(encodedMsg)
        }
        else if (msg.type === messages.messageType.clientReadyMessage) {
          // this.readyClientsBuffer = this.readyClientsBuffer.push(peerID)
          this.readyClientsBuffer.push(peerID)
          // if enough clients are connected, server shares who is connected
          if (this.readyClientsBuffer.length >= this.minConnected) {
            const readyPeerIDs: messages.serverReadyClients = { type: messages.messageType.serverReadyClients, peerList: this.readyClientsBuffer }
            for (const peerID of this.readyClientsBuffer) {
              // send peerIds to everyone in readyClients
              this.clients.get(peerID)?.send(msgpack.encode(readyPeerIDs))
            }
            // this.readyClientsBuffer = this.readyClientsBuffer.clear()
            this.readyClientsBuffer = []
          }
        } else if (msg.type === messages.messageType.clientPartialSumsMessageServer) {
          const forwardMsg: messages.clientPartialSumsMessageServer = {
            type: messages.messageType.clientPartialSumsMessageServer,
            peerID: msg.peerID,
            partials: msg.partials,
            destination: msg.destination
          }
          const encodedMsg: Buffer = msgpack.encode(forwardMsg)

          // sends message it received to destination
          this.clients.get(msg.destination)?.send(encodedMsg)
        }
      } catch (e) {
        console.error('when processing WebSocket message', e)
      }
    })
  }
}
