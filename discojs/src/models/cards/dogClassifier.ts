import { Model, ModelCard } from "../index.js";
import { model } from "../implementations/dogClassifierModel.js";

export const DogClassifier: ModelCard<"image"> = {
  card: {
    id: "dog_classifier",
    name: "Dog Classifier",
    dataType: "image",
  },

  async getModel(): Promise<Model<"image">> {
    return Promise.resolve(model());
  },
};
