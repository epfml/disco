import type express from 'express'
import msgpack from 'msgpack-lite'
import type WebSocket from 'ws'
import { type ParamsDictionary } from 'express-serve-static-core'
import { type ParsedQs } from 'qs'
import { Map, Set } from 'immutable'

import { type tf, client, type Task, type TaskID } from '@epfml/discojs-node'

import { Server } from '../server.js'

import messages = client.decentralized.messages
import messageTypes = client.messages.type
type PeerID = client.decentralized.PeerID

export class Decentralized extends Server {
  // maps peerIDs to their respective websockets so peers can be sent messages by their IDs
  private readyClientsBuffer: Map<TaskID, Set<PeerID>> = Map()
  private clients: Map<PeerID, WebSocket> = Map()
  // increments with addition of every client, server keeps track of clients with this and tells them their ID
  private clientCounter: PeerID = 0

  protected readonly description = 'DeAI Server'

  protected buildRoute (task: Task): string {
    return `/${task.taskID}`
  }

  public isValidUrl (url: string | undefined): boolean {
    const splittedUrl = url?.split('/')

    return (splittedUrl !== undefined && splittedUrl.length === 3 && splittedUrl[0] === '' &&
      this.isValidTask(splittedUrl[1]) && this.isValidWebSocket(splittedUrl[2]))
  }

  protected initTask (task: Task, model: tf.LayersModel): void {}

  protected handle (
    task: Task,
    ws: WebSocket,
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

    // how the server responds to messages
    ws.on('message', (data: Buffer) => {
      try {
        const msg: unknown = msgpack.decode(data)
        if (!messages.isMessageToServer(msg)) {
          console.warn('invalid message received:', msg)
          return
        }

        switch (msg.type) {
          case messageTypes.clientConnected: {
            this.clients = this.clients.set(peerID, ws)
            // send peerID message
            const msg: messages.PeerID = {
              type: messageTypes.PeerID,
              id: peerID
            }
            console.info('peer', peerID, 'joined', task.taskID)

            if (!this.readyClientsBuffer.has(task.taskID)) {
              this.readyClientsBuffer = this.readyClientsBuffer.set(task.taskID, Set())
            }

            console.info('send PeerId to ', peerID)
            ws.send(msgpack.encode(msg), { binary: true })
            break
          }

          case messageTypes.SignalForPeer: {
            const forward: messages.SignalForPeer = {
              type: messageTypes.SignalForPeer,
              peer: peerID,
              signal: msg.signal
            }
            this.clients.get(msg.peer)?.send(msgpack.encode(forward))
            break
          }
          case messageTypes.PeerIsReady: {
            const peers = this.readyClientsBuffer.get(task.taskID)?.add(peerID)
            if (peers === undefined) {
              throw new Error(`task ${task.taskID} doesn't exists in ready buffer`)
            }
            this.readyClientsBuffer = this.readyClientsBuffer.set(task.taskID, peers)

            if (peers.size >= minimumReadyPeers) {
              this.readyClientsBuffer = this.readyClientsBuffer.set(task.taskID, Set())

              peers
                .map((id) => {
                  const readyPeerIDs: messages.PeersForRound = {
                    type: messageTypes.PeersForRound,
                    peers: peers.delete(id).toArray()
                  }
                  const encoded = msgpack.encode(readyPeerIDs)
                  return [id, encoded] as [PeerID, Buffer]
                })
                .map(([id, encoded]) => {
                  const conn = this.clients.get(id)
                  if (conn === undefined) {
                    throw new Error(`peer ${id} marked as ready but not connection to it`)
                  }
                  return [conn, encoded] as [WebSocket, Buffer]
                }).forEach(([conn, encoded]) => { conn.send(encoded) }
                )
            }
            break
          }
        }
      } catch (e) {
        console.error('when processing WebSocket message:', e)
      }
    })
  }
}
