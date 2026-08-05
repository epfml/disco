import { Model, ModelCard } from "../index.js";
import { model } from "../implementations/titanic_classifier.js";

export const TitanicClassifier: ModelCard<"tabular"> = {
  card: {
    id: "titanic_classifier",
    name: "Titanic classifier",
    preTrained: false,
  },

  async getModel(): Promise<Model<"tabular">> {
    return Promise.resolve(model());
  },
};
