import { CONFIG } from './config'
import { getApp } from './get_server'
import { tf } from '../../discojs' // '@epfml/discojs'
import '@tensorflow/tfjs-node'

tf.ready()
  .then(() => console.log(`Loaded ${tf.getBackend()} backend`))
  .catch(console.error)

getApp()
  .then((app) => app.listen(CONFIG.serverPort))
  .catch(console.error)
