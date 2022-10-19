import { Map } from 'immutable'
import fs from 'fs'

const DISCOJS_CORE = './package.json'
const DISCOJS = './discojs/package.json'
const DISCOJS_NODE = './discojs-node/package.json'

const discojsCore = require(DISCOJS_CORE)
const discojs = require(DISCOJS)
const discojsNode = require(DISCOJS_NODE)

const jsDeps = Map(discojsCore.dependencies)
const nodeDeps = Map(discojsCore.dependencies)

discojs.dependencies = jsDeps
  .delete('@tensorflow/tfjs-node')
  .toObject()

discojsNode.dependencies = nodeDeps
  .delete('@tensorflow/tfjs')
  .toObject()

fs.writeFile(DISCOJS, JSON.stringify(discojs, null, 2), (err) => { console.log(err) })
fs.writeFile(DISCOJS_NODE, JSON.stringify(discojsNode, null, 2), (err) => { console.log(err) })
