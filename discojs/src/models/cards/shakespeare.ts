import type { Model } from "#models/model";
import type { ModelCard } from "#models/model_card";
import { GPT } from "#models/implementations/index";

export const Shakespeare: ModelCard<"text"> = {
  card: {
    id: "shakespeare",
    name: "Shakespeare GPT-2",
    dataType: "text",
    contextLength: 64,
  },

  getModel(): Promise<Model<"text">> {
    return Promise.resolve(new GPT({ contextLength: this.card.contextLength }));
  },
};
