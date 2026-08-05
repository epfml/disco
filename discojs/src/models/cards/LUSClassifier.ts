import { Model, ModelCard } from "../index.js";
import { model } from "../implementations/LUSImageClassifier.js";

export const LUSClassifier: ModelCard<"image"> = {
  card: {
    id: "lus_classifier",
    name: "LUS Classifier",
    preTrained: false,
  },

  async getModel(): Promise<Model<"image">> {
    return Promise.resolve(model());
  },
};
