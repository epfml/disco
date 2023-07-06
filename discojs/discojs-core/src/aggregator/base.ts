import { client, Task, tf, AsyncInformant } from '..'

import { EventEmitter } from 'events'

import { Map, Set } from 'immutable'

export enum AggregationStep {
  ADD,
  UPDATE,
  AGGREGATE
}

export abstract class Base<T> {
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
  protected contributions: Map<number, Map<client.NodeID, T>>
  /**
   * Emits the aggregation event whenever an aggregation step is performed.
   * Triggers the resolve of the result promise and the preparation for the
   * next aggregation round.
   */
  private readonly eventEmitter: EventEmitter

  protected informant?: AsyncInformant<T>
  /**
   * The result promise which, on resolve, will contain the current aggregation result.
   */
  protected result: Promise<T>
  /**
   * The current aggregation round, used for assessing whether a contribution is recent enough
   * or not.
   */
  protected _round = 0

  protected _communicationRound = 0

  constructor (
    public readonly task: Task,
    protected _model?: tf.LayersModel,
    protected readonly roundCutoff = 0,
    public readonly communicationRounds = 1
  ) {
    this.eventEmitter = new EventEmitter()
    this.contributions = Map()
    this._nodes = Set()

    this.result = this.makeResult()

    this.eventEmitter.on('aggregation', () => {
      this.nextRound()
    })
  }

  /**
   * Adds a node's contribution to the aggregator for a given round.
   * The contribution will be aggregated during the round's aggregation step.
   * @param nodeId The node's id
   * @param contribution The node's contribution
   * @param round For which round the contribution was made
   */
  abstract add (nodeId: client.NodeID, contribution: T, round: number, communicationRound?: number): boolean

  /**
   * Performs the aggregation step over the received node contributions.
   * Must store the aggregation's result in the aggregator's result promise.
   */
  abstract aggregate (): void

  registerObserver (informant: AsyncInformant<T>): void {
    this.informant = informant
  }

  /**
   * Returns whether the given round is recent enough, dependent on the
   * aggregator's round cutoff.
   * @param round The round
   * @returns True if the round is recent enough, false otherwise
   */
  isWithinRoundCutoff (round: number): boolean {
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
        console.log(`> Adding contribution from node ${from ?? '"unknown"'} for round (${this.communicationRound}, ${this.round})`)
        return
      case AggregationStep.UPDATE:
        if (from === undefined) {
          return
        }
        console.log(`> Updating contribution from node ${from} for round (${this.communicationRound}, ${this.round})`)
        return
      case AggregationStep.AGGREGATE:
        console.log('*'.repeat(80))
        console.log(`Buffer is full. Aggregating weights for round (${this.communicationRound}, ${this.round})\n`)
    }
  }

  setModel (model: tf.LayersModel): void {
    this._model = model
  }

  /**
   * Adds a node's id to the set of active nodes. A node represents an active neighbor
   * peer/client within the network, whom we are communicating with during this aggregation
   * round.
   * @param nodeId The node to be added
   */
  registerNode (nodeId: client.NodeID): boolean {
    if (!this.nodes.has(nodeId)) {
      this._nodes = this._nodes.add(nodeId)
      return true
    }
    return false
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

  resetNodes (): void {
    this._nodes = Set()
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
   * Emits the event containing the aggregation result, which allows the result
   * promise to resolve and for the next aggregation round to take place.
   * @param aggregated The aggregation result
   */
  protected emit (aggregated: T): void {
    this.eventEmitter.emit('aggregation', aggregated)
  }

  /**
   * Resets the aggregator's step and prepares it for the next aggregation round.
   */
  public nextRound (): void {
    if (++this._communicationRound === this.communicationRounds) {
      this._communicationRound = 0
      this._round++
      this.contributions = Map()
    }
    this.result = this.makeResult()
    this.informant?.update()
  }

  private async makeResult (): Promise<T> {
    return await new Promise((resolve) => {
      this.eventEmitter.once('aggregation', (w) => {
        resolve(w)
      })
    })
  }

  /**
   * The aggregation result can be awaited upon in an asynchronous fashion, to allow
   * for the receipt of contributions while performing other tasks. This function
   * gives access to the current aggregation result's promise, which will eventually
   * resolve and contain the result of the very next aggregation step, at the
   * time of the function call.
   * @returns The promise containing the aggregation result
   */
  async receiveResult (): Promise<T> {
    return await this.result
  }

  /**
   * Constructs the payload sent to other nodes as contribution.
   * @param base Object from which the payload is computed
   */
  abstract makePayloads (base: T): Map<client.NodeID, T>

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
   * The aggregator's current size, defined by its amount of contributions.
   * The size is bounded by the amount of all active nodes.
   */
  get size (): number {
    return this.contributions
      .valueSeq()
      .map((m) => m.size)
      .reduce((totalSize: number, size) => totalSize + size) ?? 0
  }

  /**
   * The aggregator's current model.
   */
  get model (): tf.LayersModel | undefined {
    return this._model
  }

  get communicationRound (): number {
    return this._communicationRound
  }
}
