import app from '../../src/run_server'
import { agent as request } from 'supertest'

/** Source for test setup:
 * https://dev.to/matteobruni/mocha-chai-with-typescript-37f
 */

const clientId = 'clientId'
const clientIds = ['a', 'b', 'c']
const task = 'titanic'
const nonExistingTask = 'nonExistingTask'

function connectHeader (platformID: string, taskID: string, clientID: string): string {
  return `/${platformID}/connect/${taskID}/${clientID}`
}

function disconnectHeader (platformID: string, taskID: string, clientID: string): string {
  return `/${platformID}/disconnect/${taskID}/${clientID}`
}

/**
 * Check if connecting and then disconnecting to a valid task yields 200 codes
 * @param platformID feai or deai
 * @param task task to connect to, e.g. titanic
 * @param clientID clientID
 */
async function testConnectThenDisconnect (platformID: string, task: string, clientID: string): Promise<void> {
  await request(app)
    .get(connectHeader(platformID, task, clientID))
    .expect(200)
    .then(async () => {
      await request(app)
        .get(disconnectHeader(platformID, task, clientID))
        .expect(200)
    })
}

/**
 * Platform connection tests on platformID
 * @param platformID
 */
function testConnection (platformID: string): void {
  describe(`${platformID} connection tests`, () => {
    it('connect and then disconnect to valid task', async () => {
      for (const id of clientIds) {
        await testConnectThenDisconnect(platformID, task, id)
      }
    })

    it('connect to non existing task', async () => { // the single test
      await request(app)
        .get(connectHeader(platformID, nonExistingTask, clientId))
        .expect(404)
    })
  })
}

testConnection('feai')

/**
 * TODO: Due to the reverse proxy testing deai is different.
 */
// testConnection('deai')

/**
 * Adding done() turns of the express app once the tests are done
 */
after((done) => {
  done()
})
