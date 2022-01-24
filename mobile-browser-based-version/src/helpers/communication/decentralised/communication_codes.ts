/**
 * This object contains codes to identify what the incoming data
 * should be used for, e.g. to build the model, average the weights etc...
 */
const CMD_CODES = {
  ASSIGN_WEIGHTS: 0, // inject weights into model (unused)
  TRAIN_INFO: 1, // n. epochs, etc...
  MODEL_INFO: 2, // serialized model architecture + initial weights
  COMPILE_MODEL: 3, // args to model.compile, e.g. optimizer, metrics
  AVG_WEIGHTS: 4, // weights to average into model
  WEIGHT_REQUEST: 5, // ask for weights
};

export default Object.freeze(CMD_CODES);
