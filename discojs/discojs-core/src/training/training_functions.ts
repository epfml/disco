import { tf, TrainingInformation } from '..'

/**
 * The training function is the function that will be called to train the model.
 * The model is trained locally with the given dataset, which means that it will only have access to the data of the user local machine.
 * This all happens in the client, so this data is not sent to the server, only the resulting model is.
 *
 * Every few batches, represented by the round duration ('onRoundEnd' trainer function), the model will be updated with the new aggregated weights (in the case of the distributed trainer). Depending on the training scheme, weights are aggregated on the server (federated), or between peers (decentralized).
 * The following trainings will be done with the updated model.
 * You need to be aware that the model is subject to regular changes in your training functions.
 */
export type TrainingFunction =
  (
    model: tf.LayersModel,
    trainingInformation: TrainingInformation,
    dataset: tf.data.Dataset<tf.TensorContainer>,
    valDataset: tf.data.Dataset<tf.TensorContainer>,
    onEpochBegin: (epoch: number, logs?: tf.Logs) => void,
    onEpochEnd: (epoch: number, logs?: tf.Logs) => void,
    onBatchBegin: (epoch: number, logs?: tf.Logs) => Promise<void>,
    onBatchEnd: (epoch: number, logs?: tf.Logs) => Promise<void>,
    onTrainBegin: (logs?: tf.Logs) => Promise<void>,
    onTrainEnd: (logs?: tf.Logs) => Promise<void>
  ) => Promise<void>

/**
 * Default training method used when none specified. Simply use the tensorflow fitDataset method.
 */
const defaultTraining: TrainingFunction = async (
  model, trainingInformation, dataset, valDataset, onEpochBegin, onEpochEnd, onBatchBegin, onBatchEnd, onTrainBegin, onTrainEnd
) => {
  await model.fitDataset(dataset, {
    epochs: trainingInformation.epochs,
    validationData: valDataset,
    callbacks: {
      onEpochBegin,
      onEpochEnd,
      onBatchBegin,
      onBatchEnd,
      onTrainBegin,
      onTrainEnd
    }
  })
}

enum TrainingType {
  default = 'default'
}

export const fitModelFunctions: Record<TrainingType, TrainingFunction> = {
  default: defaultTraining
}
