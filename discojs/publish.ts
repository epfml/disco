import { Map } from 'immutable'
import fs from 'fs'

const DISCOJS_CORE = './package.json'
const DISCOJS_WEB = './discojs-web/package.json'
const DISCOJS_NODE = './discojs-node/package.json'

const discojsCore = require(DISCOJS_CORE)
const discojsWeb = require(DISCOJS_WEB)
const discojsNode = require(DISCOJS_NODE)

const webDeps = Map(discojsCore.dependencies)
const nodeDeps = Map(discojsCore.dependencies)

discojsWeb.dependencies = webDeps
  .delete('@tensorflow/tfjs-node')
  .toObject()

discojsNode.dependencies = nodeDeps
  .delete('@tensorflow/tfjs')
  .toObject()

fs.writeFile(DISCOJS_WEB, JSON.stringify(discojsWeb, null, 2), (err) => { console.log(err) })
fs.writeFile(DISCOJS_NODE, JSON.stringify(discojsNode, null, 2), (err) => { console.log(err) })
