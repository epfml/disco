import { Map } from 'immutable'
import msgpack from 'msgpack-lite'
import WebSocket from 'ws'

import { client, Task, TaskID } from '@epfml/discojs'

import messages = client.decentralized.messages
type PeerID = client.decentralized.PeerID

export class SignalingServer {
  // maps peerIDs to their respective websockets so peers can be sent messages by their IDs
  private readyClientsBuffer: Map<TaskID, PeerID[]> = Map()
  private clients: Map<PeerID, WebSocket> = Map()
  // increments with addition of every client, server keeps track of clients with this and tells them their ID
  private clientCounter: PeerID = 0
  // parameter of DisCo, should be set by client
  // private readonly minConnected: number = 3

  handle (task: Task, ws: WebSocket): void {
    const minimumReadyPeers = task.trainingInformation?.minimumReadyPeers ?? 3
    const peerID: PeerID = this.clientCounter++
    this.clients = this.clients.set(peerID, ws)
    // send peerID message
    const msg: messages.serverClientIDMessage = {
      type: messages.messageType.serverClientIDMessage,
      peerID
    }
    console.info('peer', peerID, 'joined', task.taskID)

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
        } else if (msg.type === messages.messageType.clientSharesMessageServer) {
          const forwardMsg: messages.clientSharesMessageServer = {
            type: messages.messageType.clientSharesMessageServer,
            peerID: msg.peerID,
            weights: msg.weights,
            destination: msg.destination
          }
          const encodedMsg: Buffer = msgpack.encode(forwardMsg)

          // sends message it received to destination
          this.clients.get(msg.destination)?.send(encodedMsg)
        } else if (msg.type === messages.messageType.clientReadyMessage) {
          //if the readyclients map has the task
          if (this.readyClientsBuffer.has(msg.taskID)) {
            const currentClients: PeerID[] = this.readyClientsBuffer.get(msg.taskID) ?? []
            if (!currentClients.includes(msg.peerID)){
              currentClients.push(msg.peerID)
            }
            this.readyClientsBuffer = this.readyClientsBuffer.set(msg.taskID, currentClients)
          } else {
            const updatedClients: PeerID[] = [msg.peerID]
            this.readyClientsBuffer = this.readyClientsBuffer.set(msg.taskID, updatedClients)
          }
          // if enough clients are connected, server shares who is connected
          const currentPeers = this.readyClientsBuffer.get(msg.taskID)
          if (currentPeers!.length >= minimumReadyPeers) {
            const readyPeerIDs: messages.serverReadyClients = { type: messages.messageType.serverReadyClients, peerList: this.readyClientsBuffer.get(msg.taskID) ?? [] }
            for (const peerID of this.readyClientsBuffer.get(msg.taskID) ?? []) {
              // send peerIds to everyone in readyClients
              this.clients.get(peerID)?.send(msgpack.encode(readyPeerIDs))
            }
            this.readyClientsBuffer = this.readyClientsBuffer.set(msg.taskID, [])
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
