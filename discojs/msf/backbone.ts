import * as tf from '@tensorflow/tfjs-node'

/**
 * Before running this script, make sure the Disco.js dependencies are installed:
 * cd .. && npm ci
 *
 * This script attempts to load the backbone model in Tensorflow.js and make a very basic
 * use of it.
 */ 


const model = tf.loadLayersModel('file://./tfjs-backbone-model/model.json')

console.log(model.summary())

