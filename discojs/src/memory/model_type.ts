/**
 * Type of models stored in memory. Stored models can either be a model currently
 * being trained ("working model") or a regular model saved in memory ("saved model").
 * There can only be a single working model for a given task.
 */
export enum StoredModelType {
  WORKING = 'working',
  SAVED = 'saved'
}
