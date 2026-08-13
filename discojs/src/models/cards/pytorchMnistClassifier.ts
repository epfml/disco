import { Model, ModelCard } from "../index.js";
import { model } from "../implementations/pytorch_mnist_classifier.js";

export const PytorchMNISTClassifier: ModelCard<"image"> = {
  card: {
    id: "mnist_classifier",
    name: "MNIST Classifier",
    dataType: "image",
  },

  async getModel(): Promise<Model<"image">> {
    return Promise.resolve(model());
  },
};
