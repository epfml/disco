import { Map } from "immutable";
import "@tensorflow/tfjs-node";

import type {
  DataType,
  ModelCardInfo,
  ModelCard,
  Model,
  Encoded,
} from "@epfml/discojs";
import { EventEmitter, modelEncode, isEncoded } from "@epfml/discojs";

type EncodedModel = Encoded;
type AvailableModel = [ModelCardInfo<DataType>, EncodedModel];

/**
 * The ModelSet stores available encoded models along with their information.
 * Models can then be fed to Tasks.
 *
 * We work with EncodedModels rather than Models because they are sent encoded
 * to clients. Since the server doesn't need to use the Model, we
 * simply leave it already encoded and ready to be sent to clients
 *
 * Due to the asynchronous nature of `addModel`, ModelSet is an EventEmitter,
 * by registering callbacks on new models and emitting a 'newModel' event
 * when a new model has been added.
 *
 * Models are usually passed to ModelSet when booting the server
 * and objects depending on models can subscribe to the 'newModel'
 * event to run callbacks whenever a new EncodedModel is initialized.
 */
export class ModelSet extends EventEmitter<{
  newModel: AvailableModel;
}> {
  // Keep track of previously initialized models
  #models = Map<ModelCardInfo.ID, AvailableModel>();

  get models(): Map<ModelCardInfo.ID, AvailableModel> {
    return this.#models;
  }

  // send known models to new listener
  override on(
    _: "newModel",
    listener: (_: AvailableModel) => void | Promise<void>,
  ): void {
    this.#models.forEach(listener);
  }

  /**
   * Method to add a new model.
   * It accepts parameters in different formats, as long as it contains
   * model info and some way to load a model.
   * The method emits a 'newModel' event with the resulting info and EncodedModel.
   *
   * If information and EncodedModel are provided as parameters the method
   * does not change them.
   * Otherwise the method handles shaping the parameters into ModelCardInfo
   * and EncodedModel before emitting the event.
   *
   * Finally, encoded models are stored on the disk the first time they are
   * seen, so that they can be reused more easily
   */
  async addModel<D extends DataType>(
    newModel:
      | [ModelCardInfo<D>, Model<D>]
      | [ModelCardInfo<D>, EncodedModel]
      | ModelCard<D>,
  ): Promise<void> {
    // get info first to check if model already exists
    let info: ModelCardInfo<D>;
    if (!Array.isArray(newModel)) {
      info = newModel.card;
    } else {
      info = newModel[0];
    }

    if (this.#models.has(info.id)) {
      throw new Error("model already exists");
    }

    let encodedModel: EncodedModel;
    if (!Array.isArray(newModel)) {
      const model = await newModel.getModel();
      encodedModel = await modelEncode(model);
    } else {
      const model = newModel[1];
      if (isEncoded(model)) {
        encodedModel = model; // don't do anything if already encoded
      } else {
        encodedModel = await modelEncode(model);
      }
    }

    // Add the task-model pair to the set
    this.#models = this.#models.set(info.id, [info, encodedModel]);
    this.emit("newModel", [info, encodedModel]);
  }
}
