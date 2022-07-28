import express from 'express'

import { tf, client, Task, TaskID } from '@epfml/discojs'

import { Server } from '../server'
import { ParamsDictionary } from 'express-serve-static-core'
import { ParsedQs } from 'qs'

import { Map } from 'immutable'
import msgpack from 'msgpack-lite'
import WebSocket from 'ws'

import messages = client.decentralized.messages
type PeerID = client.decentralized.PeerID

export class Decentralized extends Server {
  // maps peerIDs to their respective websockets so peers can be sent messages by their IDs
  private readyClientsBuffer: Map<TaskID, Set<PeerID>> = Map()
  private clients: Map<PeerID, WebSocket> = Map()
  // increments with addition of every client, server keeps track of clients with this and tells them their ID
  private clientCounter: PeerID = 0

  protected get description (): string {
    return 'DeAI Server'
  }

  protected buildRoute (task: Task): string {
    return `/${task.taskID}`
  }

  protected sendConnectedMsg (ws: WebSocket): void {
    const msg: messages.clientConnectedMessage = {
      type: messages.messageType.clientConnected
    }
    ws.send(msgpack.encode(msg))
  }

  public isValidUrl (url: string | undefined): boolean {
    const splittedUrl = url?.split('/')

    return (splittedUrl !== undefined && splittedUrl.length === 3 && splittedUrl[0] === '' &&
      this.isValidTask(splittedUrl[1]) && this.isValidWebSocket(splittedUrl[2]))
  }

  protected initTask (task: Task, model: tf.LayersModel): void {}

  protected handle (
    task: Task,
    ws: import('ws'),
    model: tf.LayersModel,
    req: express.Request<
    ParamsDictionary,
    any,
    any,
    ParsedQs,
    Record<string, any>
    >
  ): void {
    const minimumReadyPeers = task.trainingInformation?.minimumReadyPeers ?? 3
    const peerID: PeerID = this.clientCounter++
    this.clients = this.clients.set(peerID, ws)
    // send peerID message
    const msg: messages.serverClientIDMessage = {
      type: messages.messageType.serverClientIDMessage,
      peerID
    }
    console.info('peer', peerID, 'joined', task.taskID)

    if (!this.readyClientsBuffer.has(task.taskID)) {
      this.readyClientsBuffer.set(task.taskID, new Set<PeerID>())
    }

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
        } else if (
          msg.type === messages.messageType.clientSharesMessageServer
        ) {
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
          const currentClients: Set<PeerID> =
            this.readyClientsBuffer.get(msg.taskID) ?? new Set<PeerID>()
          const updatedClients: Set<PeerID> = currentClients.add(msg.peerID)
          this.readyClientsBuffer = this.readyClientsBuffer.set(
            msg.taskID,
            updatedClients
          )
          // if enough clients are connected, server shares who is connected
          const currentPeers: Set<PeerID> =
            this.readyClientsBuffer.get(msg.taskID) ?? new Set<PeerID>()
          if (currentPeers.size >= minimumReadyPeers) {
            this.readyClientsBuffer = this.readyClientsBuffer.set(
              msg.taskID,
              new Set<PeerID>()
            )
            const readyPeerIDs: messages.serverReadyClients = {
              type: messages.messageType.serverReadyClients,
              peerList: Array.from(currentPeers)
            }
            for (const peerID of currentPeers) {
              // send peerIds to everyone in readyClients
              this.clients.get(peerID)?.send(msgpack.encode(readyPeerIDs))
            }
          }
        } else if (
          msg.type === messages.messageType.clientPartialSumsMessageServer
        ) {
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
