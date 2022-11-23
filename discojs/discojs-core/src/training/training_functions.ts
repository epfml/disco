import { tf, TrainingInformation } from '..'

export type TrainingFunction =
  (model: tf.LayersModel,
    trainingInformation: TrainingInformation,
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>,
    onEpochEnd: (epoch: number, logs?: tf.Logs) => void,
    onBatchEnd: (epoch: number, logs?: tf.Logs) => Promise<void>,
    onTrainEnd: (logs?: tf.Logs) => Promise<void>) => Promise<void>

/**
* Default training method used when none specified. Simply use the tensorflow fitDataset method.
*/
const defaultTraining: TrainingFunction = async (model, trainingInformation, dataset, valDataset, onEpochEnd, onBatchEnd, onTrainEnd) => {
  await model.fitDataset(dataset, {
    epochs: trainingInformation.epochs,
    validationData: valDataset,
    callbacks: {
      onEpochEnd: onEpochEnd,
      onBatchEnd: onBatchEnd,
      onTrainEnd: onTrainEnd
    }
  })
}

enum TrainingType {
  default = 'default'
}

export const fitModelFunctions: Record<TrainingType, TrainingFunction> = {
  default: defaultTraining
}
