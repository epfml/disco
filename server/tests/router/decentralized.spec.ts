// import { agent as request } from 'supertest'

// import { serialization, WeightsContainer } from '@epfml/discojs-web'

// import { getApp } from '../../src/get_server'

// const platformID = 'decentralized'
// const clients = {
//   one: 'one',
//   two: 'two'
// }
// const task = 'titanic'

// const weights = WeightsContainer.of([1, 1], [1, 1])

// const newRound = 1

// function connectHeader (
//   platformID: string,
//   taskID: string,
//   clientID: string
// ): string {
//   return `/${platformID}/connect/${taskID}/${clientID}`
// }

// function disconnectHeader (
//   platformID: string,
//   taskID: string,
//   clientID: string
// ): string {
//   return `/${platformID}/disconnect/${taskID}/${clientID}`
// }

// describe(`${platformID} simple connection tests`, function () {
//   this.timeout(30_000)

//   it('connect and then disconnect to valid task', async () => {
//     const app = await getApp()

//     await request(app)
//       .get(connectHeader(platformID, task, clients.one))
//       .expect(200)
//     await request(app)
//       .get(disconnectHeader(platformID, task, clients.one))
//       .expect(200)
//   })

//   it('connect to non existing task', async () => {
//     // the single test
//     const app = await getApp()
//     await request(app)
//       .get(connectHeader(platformID, 'fakeTask', clients.one))
//       .expect(404)
//   })
// })

// describe(`${platformID} weight sharing tests`, function () {
//   this.timeout(10_000)

//   it('GET /weights', async () => { // the single test
//     await request(await getApp())
//       .get(`/${platformID}/weights/${task}/${clients.one}`)
//       .expect(200)
//   })

//   it('POST /weights', async () => {
//     const app = await getApp()

//     await request(app)
//       .get(connectHeader(platformID, task, clients.one))
//       .expect(200)

//     await request(app)
//       .post(`/${platformID}/weights/${task}/${clients.one}`)
//       .send({
//         weights: await serialization.weights.encode(weights),
//         round: newRound
//       })
//       .expect(200)
//   })

//   // TODO: Add a test with a whole round, etc
// })
