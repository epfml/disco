import type tf from '@tensorflow/tfjs'

export interface TrainingCallbacks {
  onEpochEnd?: (epoch: number, logs?: tf.Logs) => Promise<void>
}
