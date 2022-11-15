import { Map } from 'immutable'
import fs from 'fs'

const DISCOJS_NODE = '../discojs/discojs-node/package.json'
const DISCO_SERVER = './package.json'

const discojsNode = require(DISCOJS_NODE)
const discoServer = require(DISCO_SERVER)

const nodeVersion = discojsNode.version
const serverDeps = Map(discoServer.dependencies)

discoServer.dependencies = serverDeps
    .set('@epfml/discojs-node', `^${nodeVersion}`)
    .toObject()

fs.writeFile(DISCO_SERVER, JSON.stringify(discoServer, null, 2) + '\n', console.error)
