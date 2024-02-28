import type tf from '@tensorflow/tfjs'

/**
 * Convenient type for the common dataset type used in TF.js.
 */
export type Dataset = tf.data.Dataset<tf.TensorContainer>
