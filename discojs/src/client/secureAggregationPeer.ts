import * as secret_shares from 'secret_shares'
import { Weights } from '@/types'
export class TestClient {

    private readonly secret: Weights;
    // Keep references to your peers
    private peers: Array<TestClient>;
    // Store shares of own secret before sending them out
    private ownSharesBuffer: Array<Weights>;
    // Store received shares of other secrets before summing them
    private receivedSharesBuffer: Array<Weights>;

    private partialSumsBuffer: Array<Weights>;

    constructor(secret: Weights) {
        this.secret = secret;
        this.peers = [];
        this.ownSharesBuffer = [];
        this.receivedSharesBuffer = [];
        this.partialSumsBuffer = [];
    }

    public registerPeer(peer: TestClient): void {
        this.peers.push(peer);
    }

    private numPeers(): number {
        return this.peers.length;
    }

    private makeOwnShares(): void {
        //generate all shares
        this.ownSharesBuffer= secret_shares.generateAllShares(this.secret, this.numPeers(), 1000)
    }

    public sendShares() : void {
        // goes through this.peers and calls peer.receiveShare. elims Share from ownSharesBuffer
        this.makeOwnShares()
        for(let peer of this.peers){
            peer.receiveShare(this.ownSharesBuffer.splice(0, 1)[0])
        }
    }

    private receiveShare(share : Weights) : void {
        // pushes received share to receivedSharesBuffer
        this.receivedSharesBuffer.push(share)
        if(this.receivedSharesBuffer.length==this.peers.length){
            //if you receive all shares, publish partial sum to all parties
            this.publishPartialSum()
        }
    }

    private publishPartialSum(): void{
        //adds completed partial sum to all peers partial attribute
        console.log('Partial Sum:', secret_shares.sum(this.receivedSharesBuffer))
        for (let peer of this.peers){
            peer.receivePartialSum(secret_shares.sum(this.receivedSharesBuffer))
        }
    }

    private receivePartialSum(partialSum: Weights): void{
        //pushes given partial to client's partial sum buffer
        this.partialSumsBuffer.push(partialSum)
        //checks if all expected partials have been reported to solve for final sum
        if(this.partialSumsBuffer.length==this.peers.length){
            console.log('Reconstruction:', secret_shares.sum(this.partialSumsBuffer))
        }
    }

}

function connectClients(allClients: Array<TestClient>): void {
//Connects all clients as peers
    for(let i in allClients){
        for(let j in allClients) {
            allClients[i].registerPeer(allClients[j])
        }
    }
}