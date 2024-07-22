// for get requests, we can use the library cypress

import { request, response } from "express"

import { client, WeightsContainer } from "@epfml/discojs"
import { startServer } from "../../src/index.js"

import { expect } from "chai"

// import { serialization, WeightsContainer } from '@epfml/discojs-web'

// import { getApp } from '../../src/get_server'

const platformID = 'deai'
const clients = {
  one: 'one',
  two: 'two'
}
const taskID = 'titanic'

const weights = WeightsContainer.of([1, 1], [1, 1])

const newRound = 1

function connectHeader(
  platformID: string,
  taskID: string,
  clientID: string
): string {
  return `/${platformID}/connect`
}

function disconnectHeader(
  platformID: string,
  taskID: string,
  clientID: string
): string {
  return `/${platformID}/disconnect`}

import { Server } from "http";

let server: Server;
let url: URL

beforeEach(async () => {
  [server, url] = await startServer();
  
});afterEach(async () => {server.close()})

describe(`${platformID} simple connection tests`, function () {
  this.timeout(30_000)

  it('connect and then disconnect to valid task', async () => {
    const ws = await new WebSocket(url+'titanic');


    ws.onmessage = await function incoming(data) {
      expect(data.data).to.equal('200');
      ws.close();

    }
    
  })

  
})

   it('connect to non existing task', async () => {
    const ws = await new WebSocket(url+'nonexistingtask');

    ws.onmessage = await function incoming(data) {
      expect(data.data).to.equal('404');
      ws.close();
    }

   })
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

