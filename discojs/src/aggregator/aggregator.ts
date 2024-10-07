import createDebug from "debug";
import { Map, Set } from 'immutable'

import type { client, WeightsContainer } from '../index.js'

import { EventEmitter } from '../utils/event_emitter.js'

const debug = createDebug("discojs:aggregator");

export enum AggregationStep {
  ADD,
  UPDATE,
  AGGREGATE
}

/**
 * Main, abstract, aggregator class whose role is to buffer contributions and to produce
 * a result based off their aggregation, whenever some defined condition is met.
 *
 * Emits an event whenever an aggregation step is performed.
 * Users wait for this event to fetch the aggregation result.
 */
export abstract class Aggregator extends EventEmitter<{'aggregation': WeightsContainer }> {
  /**
   * Contains the ids of all active nodes, i.e. members of the aggregation group at
   * a given round. It is a subset of all the nodes available in the network.
   */
  protected _nodes: Set<client.NodeID>
  /**
   * Contains the contributions received from active nodes, accessible by node id.
   * It defines the effective aggregation group, which is possibly a subset
   * of all active nodes, depending on the aggregation scheme.
   */
  // communication round -> NodeID -> WeightsContainer
  protected contributions: Map<number, Map<client.NodeID, WeightsContainer>>

  /**
   * The current aggregation round, used for assessing whether a node contribution is recent enough
   * or not.
   */
  protected _round = 0
  /**
   * The current communication round. A single aggregation round is made of possibly multiple
   * communication rounds. This makes the aggregator free to perform intermediate aggregation
   * steps based off communication with its nodes. Overall, this allows for more complex
   * aggregation schemes requiring an exchange of information between nodes before aggregating.
   */
  protected _communicationRound = 0

  constructor (
    /**
     * The round cut-off for contributions.
     */
    protected readonly roundCutoff = 0,
    /**
     * The number of communication rounds occurring during any given aggregation round.
     */
    public readonly communicationRounds = 1
  ) {
    super()

    this.contributions = Map()
    this._nodes = Set()

    // On each aggregation, increment
    // updates the aggregator's state to proceed to the next communication round.
    // If all communication rounds were performed, proceeds to the next aggregation round
    // and empties the collection of stored contributions.
    this.on('aggregation', () => {
      this._communicationRound++;
      if (this.communicationRound === this.communicationRounds) {
        this._communicationRound = 0
        this._round++
        this.contributions = Map()
      }
    })
  }

  /**
   * Adds a node's contribution to the aggregator for the given aggregation and communication rounds.
   * The aggregation round is increased whenever a new global model is obtained and local models are updated.
   * Within one aggregation round there may be multiple communication rounds (such as for the decentralized secure aggregation
   * which requires multiple steps to obtain a global model)
   * The contribution will be aggregated during the next aggregation step.
   * 
   * @param nodeId The node's id
   * @param contribution The node's contribution
   * @returns a promise for the aggregated weights, or undefined if the contribution is invalid
   */
  async add(nodeId: client.NodeID, contribution: WeightsContainer, communicationRound?: number): Promise<WeightsContainer> {   
    // Calls the abstract method _add, which is implemented in the subclasses
    this._add(nodeId, contribution, communicationRound)
    return this.createAggregationPromise()
  }
  
  // Abstract method to be implemented by subclasses
  // Handles logging and adding the contribution to the list of the current round's contributions
  protected abstract _add(nodeId: client.NodeID, contribution: WeightsContainer, communicationRound?: number): void

  /**
   * Create a promise which resolves when enough contributions are received and 
   * local updates are aggregated. 
   * If the aggregator has enough contribution then we can aggregate the weights
   * directly (and emit the 'aggregation' event)
   * Otherwise we wait for the 'aggregation' event which will be emitted once 
   * enough contributions are received
   * 
   * @returns a promise for the aggregated weights
   */
  protected createAggregationPromise(): Promise<WeightsContainer> {
    // Wait for the aggregation event to be emitted
    const ret = new Promise<WeightsContainer>((resolve) => this.once('aggregation', resolve));
    
    if (this.isFull()) {
      const aggregatedWeights = this.aggregate()
      // Emitting the 'aggregation' communicates the aggregation to other clients and
      // takes care of incrementing the round
      this.emit('aggregation', aggregatedWeights)
    }
    
    return ret
  }

  /**
   * Evaluates whether a given participant contribution can be used in the current aggregation round
   * the boolean returned by `this.add` is obtained via `this.isValidContribution`
   */
  isValidContribution(nodeId: client.NodeID, round: number): boolean {
    if (!this.nodes.has(nodeId)) {
      debug("Contribution rejected because node id is not registered")
      return false;
    }
    if (!this.isWithinRoundCutoff(round)) {
      debug(`Contribution rejected because round ${round} is not within round cutoff`)
      return false;
    }
    return true
  }

  /**
   * Performs an aggregation step over the received node contributions.
   * Must store the aggregation's result in the aggregator's result promise.
   */
  protected abstract aggregate (): WeightsContainer

  /**
   * Returns whether the given round is recent enough, dependent on the
   * aggregator's round cutoff.
   * @param round The round
   * @returns True if the round is recent enough, false otherwise
   */
  private isWithinRoundCutoff (round: number): boolean {
    return this.round - round <= this.roundCutoff
  }

  /**
   * Logs useful messages during the various aggregation steps.
   * @param step The aggregation step
   * @param from The node which triggered the logging message
   */
  log (step: AggregationStep, from?: client.NodeID): void {
    switch (step) {
      case AggregationStep.ADD:
        debug(`Adding contribution from node ${from ?? '"unknown"'} for aggregation round ${this.round} and communication round ${this.communicationRound}`);
        break
      case AggregationStep.UPDATE:
        if (from === undefined) {
          return
        }
        debug(`Updating contribution from node ${from} for aggregation round ${this.round} and communication round ${this.communicationRound}`)
        break
      case AggregationStep.AGGREGATE:
        debug(`Buffer is full. Aggregating weights for round aggregation round ${this.round} and communication round ${this.communicationRound}`)
        break
      default: {
        const _: never = step
        throw new Error('should never happen')
      }
    }
  }

  /**
   * Adds a node's id to the set of active nodes. A node represents an active neighbor
   * peer/client within the network, whom we are communicating with during this aggregation
   * round.
   * @param nodeId The node to be added
   * @returns True is the node wasn't already in the list of nodes, False if already included
   */
  registerNode (nodeId: client.NodeID): boolean {
    if (!this.nodes.has(nodeId)) {
      this._nodes = this._nodes.add(nodeId)
      return true
    }
    return false
  }

  /**
   * Remove a node's id from the set of active nodes.
   * @param nodeId The node to be removed
   */
  removeNode (nodeId: client.NodeID): void{
    this._nodes = this._nodes.delete(nodeId)
  }

  /**
   * Overwrites the current set of active nodes with the given one. A node represents
   * an active neighbor peer/client within the network, whom we are communicating with
   * during this aggregation round.
   * @param nodeIds The new set of nodes
   */
  setNodes (nodeIds: Set<client.NodeID>): void {
    this._nodes = nodeIds
  }

  /**
   * Sets the aggregator's round number. To be used whenever the aggregator is out of sync
   * with the network's round.
   * @param round The new round
   */
  setRound (round: number): void {
    if (round > this.round) {
      this._round = round
    }
  }

  /**
   * Constructs the payloads sent to other nodes as contribution.
   * @param base Object from which the payload is computed
   */
  abstract makePayloads (base: WeightsContainer): Map<client.NodeID, WeightsContainer>

  abstract isFull (): boolean

  /**
   * The set of node ids, representing our neighbors within the network.
   */
  get nodes (): Set<client.NodeID> {
    return this._nodes
  }

  /**
   * The aggregation round.
   */
  get round (): number {
    return this._round
  }

  /**
   * The current communication round.
   */
  get communicationRound (): number {
    return this._communicationRound
  }
}
