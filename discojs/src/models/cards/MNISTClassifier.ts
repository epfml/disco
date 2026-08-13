import { Model, ModelCard } from "../index.js";
import { model } from "../implementations/MNISTClassifierModel.js";

export const MNISTClassifier: ModelCard<"image"> = {
  card: {
    id: "mnist_classifier",
    name: "MNIST Classifier",
    dataType: "image",
  },

  async getModel(): Promise<Model<"image">> {
    return Promise.resolve(model());
  },
};
