// import { List, Map, Seq, Set } from 'immutable'
// import msgpack from 'msgpack-lite'
// import SimplePeer from 'simple-peer'
// import * as secret_shares from '../secret_shares'
// import * as decentralizedGeneral from './decentralized'
// import { DecentralizedGeneral } from './decentralized'
// import * as messages from '../messages'
//
// import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'
//
// // Time to wait between network checks in milliseconds.
// const TICK = 100
//
// // minimum clients we want connected in order to start sharing
// const minimumReady = 3
//
// // Time to wait for the others in milliseconds.
// const MAX_WAIT_PER_ROUND = 10_000
//
// export class SecureDecentralized extends DecentralizedGeneral {
//   private readonly receivedPartialSums: List<Weights> = List() // set of partial sums received by peers
//   private mySum: Weights = []
//
//   // // sends message to server that they are ready to share
//   // private sendReadyMessage (epoch: number, trainingInformant: TrainingInformant
//   // ): void {
//   //   // Broadcast our readiness
//   //   const msg: ClientReadyMessage = {
//   //     peerId: this.ID,
//   //     epoch: epoch
//   //   }
//   //   const encodedMsg = msgpack.encode(msg)
//   //   if (this.server === undefined){
//   //     throw new Error('server undefined, could not connect peers')
//   //   }
//   //   this.server.send(encodedMsg)
//   // }
//
//   // send split shares to connected peers
//   private async sendShares (updatedWeights: Weights,
//     staleWeights: Weights,
//     epoch: number,
//     trainingInformant: TrainingInformant): Promise<void> {
//     // identify peer connections, make weight shares, add differential privacy
//     let connectedPeers: Map<PeerID, SimplePeer.Instance> = this.peers.filter((peer) => peer.connected) // connected error
//     const noisyWeights: Weights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
//     const weightShares: List<Weights> = secret_shares.generateAllShares(noisyWeights, connectedPeers.size, 1000)
//     // List()
//
//     // Broadcast our weights to ith peer
//     for (let i = 0; i < connectedPeers.size; i++) {
//       const weights: Weights = weightShares.get(i) ?? []
//       const msg: PeerMessage = {
//         epoch: epoch,
//         weights: await serialization.weights.encode(weights)
//       }
//       const encodedMsg = msgpack.encode(msg)
//       const peerList: number[] = Array.from(connectedPeers.keys())
//       const currentPeer: SimplePeer.Instance | undefined = connectedPeers.get(peerList[i])
//       if (currentPeer !== undefined) {
//         currentPeer.send(encodedMsg)
//       } else {
//         throw new Error('Invalid peer request')
//       }
//     }
//     // Get weights from the others
//     const getWeights = (): Seq.Indexed<Weights | undefined> =>
//       this.receivedSharesBuffer
//         .valueSeq()
//         .map((epochesWeights) => epochesWeights.get(epoch))
//
//     const timeoutError = new Error('timeout')
//     await new Promise<void>((resolve, reject) => {
//       const interval = setInterval(() => {
//         const gotAllWeights =
//                     getWeights().every((weights) => weights !== undefined)
//
//         if (gotAllWeights) {
//           const receivedWeights = getWeights().filter((weights) => weights !== undefined).toSet() as Set<Weights>
//           // Average weights
//           trainingInformant.addMessage('Averaging weights')
//           trainingInformant.updateNbrUpdatesWithOthers(1)
//           this.mySum = aggregation.averageWeights(receivedWeights)
//           clearInterval(interval)
//           resolve()
//         }
//       }, TICK)
//
//       setTimeout(() => {
//         clearInterval(interval)
//         reject(timeoutError)
//       }, MAX_WAIT_PER_ROUND)
//     }).catch((err) => {
//       if (err !== timeoutError) {
//         throw err
//       }
//     })
//   }
//
//   private sendPartialSums (): void {
//     const connectedPeers: Map<PeerID, SimplePeer.Instance> = this.peers.filter((peer) => peer.connected)
//     // Broadcast our sum to everyone
//     for (const peer of connectedPeers.keys()) {
//       const msg: PeerPartialSumMessage = {
//         peerId: this.ID,
//         partial: this.mySum
//       }
//       const encodedMsg = msgpack.encode(msg)
//       const currentPeer: SimplePeer.Instance | undefined = connectedPeers.get(peer)
//       if (currentPeer !== undefined) {
//         currentPeer.send(encodedMsg)
//       } else {
//         throw new Error('Invalid peer request')
//       }
//     }
//   }
//
//   // send message that we are ready at end of round, if enough people are ready, calls sendShares
//   override async onRoundEndCommunication (updatedWeights: Weights,
//     staleWeights: Weights,
//     epoch: number,
//     trainingInformant: TrainingInformant): Promise<Weights | undefined> {
//     // send ready message
//     this.sendReadyMessage(epoch, trainingInformant) //don't continue from here until peers is not empty
//     await this.sendShares(updatedWeights, staleWeights, epoch, trainingInformant)
//     this.sendPartialSums()
//     this.partialSumsBuffer.push(this.mySum)
//     return secret_shares.sum(this.partialSumsBuffer)
//   }
// }
