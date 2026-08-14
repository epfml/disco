import type { Model } from "#models/model";
import type { ModelCard } from "#models/model_card";
import { model } from "#models/implementations/dogClassifierModel";

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
