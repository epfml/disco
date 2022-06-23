import * as secret_shares from 'secret_shares'
import { List } from 'immutable'
import { Weights } from '@/types'
export class TestClient {
  private readonly secret: Weights
  // Keep references to your peers
  private readonly peers: TestClient[]
  // Store shares of own secret before sending them out
  private ownSharesBuffer: List<Weights>
  // Store received shares of other secrets before summing them
  private readonly receivedSharesBuffer: List<Weights>

  private readonly partialSumsBuffer: List<Weights>

  constructor (secret: Weights) {
    this.secret = secret
    this.peers = []
    this.ownSharesBuffer = List()
    this.receivedSharesBuffer = List()
    this.partialSumsBuffer = List()
  }

  public registerPeer (peer: TestClient): void {
    this.peers.push(peer)
  }

  private numPeers (): number {
    return this.peers.length
  }

  private makeOwnShares (): void {
    // generate all shares
    this.ownSharesBuffer = secret_shares.generateAllShares(this.secret, this.numPeers(), 1000)
  }

  public sendShares (): void {
    // goes through this.peers and calls peer.receiveShare. elims Share from ownSharesBuffer
    this.makeOwnShares()
    let counter: number = 0
    for (const peer of this.peers) {
      peer.receiveShare(this.ownSharesBuffer.get(counter) ?? [])
      counter += 1
    }
  }

  private receiveShare (share: Weights): void {
    // pushes received share to receivedSharesBuffer
    this.receivedSharesBuffer.push(share)
    if (this.receivedSharesBuffer.size === this.peers.length) {
      // if you receive all shares, publish partial sum to all parties
      this.publishPartialSum()
    }
  }

  private publishPartialSum (): void {
    // adds completed partial sum to all peers partial attribute
    console.log('Partial Sum:', secret_shares.sum(this.receivedSharesBuffer))
    for (const peer of this.peers) {
      peer.receivePartialSum(secret_shares.sum(this.receivedSharesBuffer))
    }
  }

  private receivePartialSum (partialSum: Weights): void {
    // pushes given partial to client's partial sum buffer
    this.partialSumsBuffer.push(partialSum)
    // checks if all expected partials have been reported to solve for final sum
    if (this.partialSumsBuffer.size === this.peers.length) {
      console.log('Reconstruction:', secret_shares.sum(this.partialSumsBuffer))
    }
  }
}

// function connectClients (allClients: TestClient[]): void {
// // Connects all clients as peers
//   for (const i in allClients) {
//     for (const j in allClients) {
//       allClients[i].registerPeer(allClients[j])
//     }
//   }
// }
