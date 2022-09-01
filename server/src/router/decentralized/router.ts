import express from 'express'

import { tf, client, Task, TaskID } from '@epfml/discojs'

import { Server } from '../server'
import { ParamsDictionary } from 'express-serve-static-core'
import { ParsedQs } from 'qs'

import { Map, Set } from 'immutable'
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
      type: messages.type.clientConnected
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
    const msg: messages.PeerID = {
      type: messages.type.PeerID,
      id: peerID
    }
    console.info('peer', peerID, 'joined', task.taskID)

    if (!this.readyClientsBuffer.has(task.taskID)) {
      this.readyClientsBuffer = this.readyClientsBuffer.set(task.taskID, Set())
    }

    ws.send(msgpack.encode(msg), { binary: true })

    // how the server responds to messages
    ws.on('message', (data: Buffer) => {
      try {
        const msg: unknown = msgpack.decode(data)
        if (
          !messages.isMessageToServer(msg) &&
          !messages.isPeerMessage(msg)
        ) {
          console.warn('invalid message received:', msg)
          return
        }

        switch (msg.type) {
          case messages.type.Weights: {
            const forwardMsg: messages.Weights = {
              type: messages.type.Weights,
              peer: peerID,
              weights: msg.weights
            }
            const encodedMsg: Buffer = msgpack.encode(forwardMsg)

            // sends message it received to destination
            this.clients.get(msg.peer)?.send(encodedMsg)
            break
          }
          case messages.type.Shares: {
            const forwardMsg: messages.Shares = {
              type: messages.type.Shares,
              peer: peerID,
              weights: msg.weights
            }
            const encodedMsg: Buffer = msgpack.encode(forwardMsg)

            // sends message it received to destination
            this.clients.get(msg.peer)?.send(encodedMsg)
            break
          }
          case messages.type.PeerIsReady: {
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
                    type: messages.type.PeersForRound,
                    peers: peers.toArray()
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
                }).forEach(([conn, encoded]) =>
                  conn.send(encoded)
                )
            }
            break
          }
          case messages.type.PartialSums: {
            const forwardMsg: messages.PartialSums = {
              type: messages.type.PartialSums,
              peer: peerID,
              partials: msg.partials
            }
            const encodedMsg: Buffer = msgpack.encode(forwardMsg)

            // sends message it received to destination
            this.clients.get(msg.peer)?.send(encodedMsg)
            break
          }
        }
      } catch (e) {
        console.error('when processing WebSocket message:', e)
      }
    })
  }
}
