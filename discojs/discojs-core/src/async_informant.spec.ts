// TODO @s314cy
// /* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
// import { expect } from 'chai'
// import { List } from 'immutable'

// import { AsyncInformant, defaultTasks } from '@epfml/discojs-node'

// import { MockMeanAggregator } from './aggregator/mean.spec'

// const task = defaultTasks.titanic.getTask()
// const model = defaultTasks.titanic.getModel()
// const weights = List.of(0, 1, 2)
// const bufferCapacity = weights.size

// describe('AsyncInformant tests', () => {
//   it('get correct round number', async () => {
//     const aggregator = new MockMeanAggregator(task, await model, bufferCapacity)
//     const informant = new AsyncInformant(aggregator)
//     aggregator.registerObserver(informant)

//     expect(informant.round).to.equal(0)
//     const result = aggregator.receiveResult()
//     weights.rest().forEach((w) => aggregator.add(w.toString(), w, Date.now()))
//     expect(informant.round).to.equal(0)

//     const w = weights.first() as number
//     aggregator.add(w.toString(), w, Date.now())
//     await result
//     expect(informant.round).to.equal(1)
//   })
//   it('get correct number of participants for last round', async () => {
//     const aggregator = new MockMeanAggregator(task, await model, bufferCapacity)
//     const informant = new AsyncInformant(aggregator)
//     aggregator.registerObserver(informant)

//     const result = aggregator.receiveResult()
//     weights.rest().forEach((w) => aggregator.add(w.toString(), w, Date.now()))
//     expect(informant.currentNumberOfParticipants).to.equal(weights.size - 1)

//     const w = weights.first() as number
//     aggregator.add(w.toString(), w, Date.now())
//     await result
//     expect(informant.currentNumberOfParticipants).to.equal(0)
//   })
//   it('get correct average number of participants', async () => {
//     const aggregator = new MockMeanAggregator(task, await model, bufferCapacity)
//     const informant = new AsyncInformant(aggregator)
//     aggregator.registerObserver(informant)

//     let result = aggregator.receiveResult()
//     weights.forEach((w) => aggregator.add(w.toString(), w, Date.now()))
//     await result

//     result = aggregator.receiveResult()
//     weights.forEach((w) => aggregator.add(w.toString(), w, Date.now()))
//     await result
//     expect(informant.averageNumberOfParticipants).to.equal(bufferCapacity)
//   })
//   it('get correct total number of participants', async () => {
//     const aggregator = new MockMeanAggregator(task, await model, bufferCapacity)
//     const informant = new AsyncInformant(aggregator)
//     aggregator.registerObserver(informant)

//     weights.forEach((w) => aggregator.add(w.toString(), w, Date.now()))
//     weights.forEach((w) => aggregator.add(w.toString(), w, Date.now()))
//     expect(informant.totalNumberOfParticipants).to.equal(2 * weights.size)
//   })
// })
