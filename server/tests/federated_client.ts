import { expect } from 'chai'
import * as http from 'http'

import { FederatedClient, Task, TrainingInformant, TrainingSchemes } from 'discojs'

import app from '../src/run_server'
import { CONFIG } from '../src/config'
import { getTasks } from '../src/tasks/tasks_io'

const taskID = 'titanic'

describe('federated client', () => { // the tests container
  let server: http.Server

  before(async () => {
    server = http.createServer(app).listen()
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
  })

  after(() => {
    server?.close()
  })

  const getClient = async (task?: Task): Promise<FederatedClient> => {
    const addr = server?.address()
    if (addr === undefined || addr === null) {
      throw new Error('server not started')
    }

    let url: string
    if (typeof addr === 'string') {
      url = addr
    } else if (typeof addr === 'object') {
      if (addr.family === '4') {
        url = `${addr.address}:${addr.port}`
      } else {
        url = `[${addr.address}]:${addr.port}`
      }
    } else {
      throw new Error('unable to get address to server')
    }
    url = `http://${url}/feai`

    const t = task ?? (await getTasks(CONFIG.tasksFile))[0]
    return new FederatedClient(url, t)
  }

  it('connect to valid task', async () => {
    const client = await getClient()
    await client.connect()
  })

  it('disconnect from valid task', async () => {
    const client = await getClient()
    await client.connect()
    await client.disconnect()
  })

  it('Connect to non valid task', async () => {
    const client = await getClient(new Task('nonValidTask'))

    try {
      await client.connect()
    } catch {
      return
    }

    throw new Error("connect didn't fail")
  })

  it('checks that getRound returns a value greater or equal to zero', async () => {
    const client = await getClient()
    await client.connect()

    const round = await client.getLatestServerRound()
    expect(round).to.be.greaterThanOrEqual(0) // Since the server you are running might have trained and round > 0

    await client.disconnect()
  })

  it('checks that getAsyncWeightInformantStatistics returns a JSON with the expected statistics', async () => {
    const client = await getClient()
    await client.connect()

    const ti = new TrainingInformant(0, taskID, TrainingSchemes.FEDERATED)
    await client.pullServerStatistics(ti)

    expect(ti.currentRound).to.be.greaterThanOrEqual(0) // Since the server you are running might have trained and round > 0
    expect(ti.currentNumberOfParticipants).to.be.greaterThanOrEqual(0)
    expect(ti.totalNumberOfParticipants).to.be.greaterThanOrEqual(0)
    expect(ti.averageNumberOfParticipants).to.be.greaterThanOrEqual(0)

    await client.disconnect()
  })
})
