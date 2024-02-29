import type tf from '@tensorflow/tfjs'

export interface TrainingCallbacks {
  onEpochBegin?: (epoch: number, logs?: tf.Logs) => Promise<void>
  onEpochEnd?: (epoch: number, logs?: tf.Logs) => Promise<void>
  onBatchBegin?: (batch: number, logs?: tf.Logs) => Promise<void>
  onBatchEnd?: (batch: number, logs?: tf.Logs) => Promise<void>
  onTrainBegin?: (logs?: tf.Logs) => Promise<void>
  onTrainEnd?: (logs?: tf.Logs) => Promise<void>
}
