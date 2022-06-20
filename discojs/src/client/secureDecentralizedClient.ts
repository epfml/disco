import { List, Map, Seq, Set } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
import { URL } from 'url'
import * as secureAggregationPeer from './secureAggregationPeer'
import * as secret_shares from 'secret_shares'
import * as decentralized from './decentralized'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'

interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }

// Time to wait between network checks in milliseconds.
const TICK = 100

//minimum clients we want connected in order to start sharing
const minimumReady = 3

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

type PeerID = number
type EncodedSignal = Uint8Array
type ServerOpeningMessage = PeerID[]
type ServerPeerMessage = [PeerID, EncodedSignal]

interface PeerReadyMessage { peerId: PeerID, epoch: number}
function isPeerReadyMessage (data: unknown): data is PeerReadyMessage {
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('peerId', 'epoch'))) {
    return false
  }
  const { peerId, epoch } = data as Record<'peerId' | 'epoch', unknown>

  if (
    typeof epoch !== 'number' ||
    typeof peerId !== 'number'
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: PeerReadyMessage = { peerId, epoch}

  return true
}

export class secureDecentralizedClient extends decentralized.Decentralized {
    private receivedReadyBuffer: Array<PeerReadyMessage> = [];
    private receivedSharesBuffer: Array<Weights> = [];// same as this.weights  **USE MY own field for this
    private partialSumsBuffer: Array<Weights> = [];
    private myWeights: Weights = [];
    private ID: number = 0; //NEED TO MAKE THIS DECLARED BY TASK

    //receive data, need to implement receiving partial sums, in connect new peer from decentralized
    override peerOnData(peer: SimplePeer.Instance, peerID: number, data: any) {
        const message = msgpack.decode(data)
        //if message is weights sent from peers
        if (decentralized.isPeerMessage(message)) {
            const weights = serialization.weights.decode(message.weights)

            console.debug('peer', peerID, 'sent weights', weights)
            //
            if (this.weights.get(peer)?.get(message.epoch) !== undefined) {
                throw new Error(`weights from ${peerID} already received`)
            }
            this.weights.set(peer,
                this.weights.get(peer, List<Weights>())
                    .set(message.epoch, weights))
        } else if (isPeerReadyMessage(message)) {
            for (let elem of this.receivedReadyBuffer) {
                if (message.peerId === elem.peerId) {
                    throw new Error(`ready message from ${peerID} already received`)
                }
            }
            this.receivedReadyBuffer.push(message)
            //   if (this.receivedReadyBuffer.length>=minimumReady){
            //       this.sendShares(this.myWeights,
            // this.myWeights,
            // epoch,
            // TrainingInformant)
            //   } this doesn't work bc we don't know the sendShares information of the peer here//if the peer is ready
        } else {
            throw new Error(`invalid message received from ${peerID}`)
        }
    }

//sends message to connected peers that they are ready to share
    async sendReadyMessage(epoch: number, trainingInformant: TrainingInformant
    ): Promise<void> {
        // Broadcast our readiness
        const msg: PeerReadyMessage = {
            peerId: this.ID,
            epoch: epoch
        }
        const encodedMsg = msgpack.encode(msg)

        this.peers
            .filter((peer) => peer.connected)
            .forEach((peer, peerID) => {
                trainingInformant.addMessage(`Sending readiness to peer ${peerID}`)
                peer.send(encodedMsg)
            })
    }

    //send split shares to connected peers
    override async sendShares(updatedWeights: Weights,
                              staleWeights: Weights,
                              epoch: number,
                              trainingInformant: TrainingInformant): Promise<Weights> {
        // identify peer connections, make weight shares, add differential privacy
        //NEED TO MAKE SURE THAT WE ARE SELF-CONNECTED AS A PEER
        const connectedPeers: Map<PeerID, SimplePeer.Instance> = this.peers.filter((peer) => peer.connected)
        const noisyWeights: Weights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
        const weightShares: Array<Weights> = secret_shares.generateAllShares(noisyWeights, connectedPeers.size, 1000)

        // Broadcast our weights to ith peer
        for (let i = 0; i < weightShares.length; i++) {
            const msg: PeerMessage = {
                epoch: epoch,
                weights: await serialization.weights.encode(weightShares[i])
            }
            const encodedMsg = msgpack.encode(msg)
            let peerList: Array<number> = Array.from(connectedPeers.keys())
            let currentPeer: SimplePeer.Instance | undefined = connectedPeers.get(peerList[i])
            if (currentPeer !== undefined) {
                currentPeer.send(encodedMsg)
            } else {
                throw new Error("Invalid peer request")
            }
        }
        // Get weights from the others
        const getWeights = (): Seq.Indexed<Weights | undefined> =>
            this.weights
                .valueSeq()
                .map((epochesWeights) => epochesWeights.get(epoch))

        const timeoutError = new Error('timeout')
        await new Promise<void>((resolve, reject) => {
            const interval = setInterval(() => {
                const gotAllWeights =
                    getWeights().every((weights) => weights !== undefined)

                if (gotAllWeights) {
                    clearInterval(interval)
                    resolve()
                }
            }, TICK)

            setTimeout(() => {
                clearInterval(interval)
                reject(timeoutError)
            }, MAX_WAIT_PER_ROUND)
        }).catch((err) => {
            if (err !== timeoutError) {
                throw err
            }
        })

        const receivedWeights = getWeights()
            .filter((weights) => weights !== undefined)
            .toSet() as Set<Weights>

        // Average weights
        trainingInformant.addMessage('Averaging weights')
        trainingInformant.updateNbrUpdatesWithOthers(1)

        return aggregation.averageWeights(receivedWeights)
    }

//send message that we are ready at end of round, if enough people are ready, calls sendShares
    override async onRoundEndCommunication(updatedWeights: Weights,
                                           staleWeights: Weights,
                                           epoch: number,
                                           trainingInformant: TrainingInformant): Promise<Weights | undefined> {
        this.sendReadyMessage(epoch, trainingInformant)
        //check if buffer is full and ready to secret share
        const timeoutError = new Error('timeout')
        await new Promise<void>((resolve, reject) => {
            const interval = setInterval(() => {
                //execute checking buffer length when we receive message
                // if full, check to ensure everyone still connected
                //send shares triggered for everyone when condition of readinessn met
                const gotAllReadyMessages = this.receivedReadyBuffer.length >= minimumReady; //will want to change to wait x seconds to see if others are ready to connect also
                if (gotAllReadyMessages) {
                    clearInterval(interval)
                    return this.sendShares(updatedWeights, staleWeights, epoch, trainingInformant)
                    resolve()
                }
            }, TICK)

            setTimeout(() => {
                clearInterval(interval)
                reject(timeoutError)
            }, MAX_WAIT_PER_ROUND)
        }).catch((err) => {
            if (err !== timeoutError) {
                throw err
            }
        })
        return undefined
    }
}