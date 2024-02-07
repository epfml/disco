/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { assert, expect } from 'chai'
import { Map } from 'immutable'

import { aggregator, defaultTasks, client, Task, tf } from '..'
import { AggregationStep } from './base'

const task = defaultTasks.titanic.getTask()
const model = defaultTasks.titanic.getModel()
const id = 'a'
const weights = [1, 2, 3]
const newWeights = [4, 5, 6]
const bufferCapacity = weights.length

export class MockMeanAggregator extends aggregator.AggregatorBase<number> {
  constructor (
    task: Task,
    model: tf.LayersModel,
    private readonly threshold: number,
    roundCutoff = 0
  ) {
    super(task, model, roundCutoff, 1)
  }

  isFull (): boolean {
    return this.size >= this.threshold
  }

  add (nodeId: client.NodeID, contribution: number, round: number): boolean {
    if (this.isWithinRoundCutoff(round)) {
      this.log(AggregationStep.ADD, nodeId)
      this.contributions = this.contributions.setIn([0, nodeId], contribution)
      this.informant?.update()
      if (this.isFull()) {
        this.aggregate()
      }
      return true
    }
    return false
  }

  aggregate (): void {
    this.log(AggregationStep.AGGREGATE)
    const contribs = this.contributions.get(0)?.valueSeq().toList()
    if (contribs === undefined) {
      throw new Error()
    }
    this.emit(contribs.reduce((acc: number, e) => acc + e) / contribs.size)
  }

  makePayloads (base: number): Map<client.NodeID, number> {
    return this.nodes.toMap().map(() => base)
  }
}

describe('mean aggregator tests', () => {
  it('adding weight update with old time stamp returns false', async () => {
    const t0 = -1
    const aggregator = new MockMeanAggregator(task, await model, bufferCapacity)
    assert.isFalse(aggregator.add(id, weights[0], t0))
  })

  it('adding weight update with recent time stamp returns true', async () => {
    const aggregator = new MockMeanAggregator(task, await model, bufferCapacity)
    const t0 = Date.now()
    assert.isTrue(aggregator.add(id, weights[0], t0))
  })

  it('aggregator returns false if it is not full', async () => {
    const aggregator = new MockMeanAggregator(task, await model, bufferCapacity)
    assert.isFalse(aggregator.isFull())
  })

  it('aggregator with standard cutoff = 0', async () => {
    const aggregator = new MockMeanAggregator(task, await model, bufferCapacity)
    assert.isTrue(aggregator.isWithinRoundCutoff(0))
    assert.isFalse(aggregator.isWithinRoundCutoff(-1))
  })

  it('aggregator with different cutoff = 1', async () => {
    const aggregator = new MockMeanAggregator(task, await model, bufferCapacity, 1)
    assert.isTrue(aggregator.isWithinRoundCutoff(0))
    assert.isTrue(aggregator.isWithinRoundCutoff(-1))
    assert.isFalse(aggregator.isWithinRoundCutoff(-2))
  })

  it('adding enough updates to buffer launches aggregator and updates weights', async () => {
    const aggregator = new MockMeanAggregator(task, await model, bufferCapacity)
    const mockAggregatedWeights = 2

    const result = aggregator.receiveResult()

    const t0 = Date.now()
    weights.forEach((w) => aggregator.add(w.toString(), w, t0))
    expect(aggregator.size).equal(0)
    expect(await result).eql(mockAggregatedWeights)
    expect(aggregator.round).equal(1)
  })

  it('testing two full cycles (adding x2 buffer capacity)', async () => {
    const aggregator = new MockMeanAggregator(task, await model, bufferCapacity, 0)

    let mockAggregatedWeights = 2
    let result = aggregator.receiveResult()
    const t0 = Date.now()
    weights.forEach((w) => aggregator.add(w.toString(), w, t0))
    expect(await result).eql(mockAggregatedWeights)

    mockAggregatedWeights = 5
    result = aggregator.receiveResult()
    const t1 = Date.now()
    newWeights.map(async (w) => aggregator.add(w.toString(), w, t1))
    expect(await result).eql(mockAggregatedWeights)
    expect(aggregator.round).equal(2)
  })
})
