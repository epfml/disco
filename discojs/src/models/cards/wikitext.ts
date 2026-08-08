import type { Model } from "#models/model";
import type { ModelCard } from "#models/model_card";
import { GPT } from "#models/implementations/index";

export const Wikitext: ModelCard<"text"> = {
  card: {
    id: "wikitext",
    name: "Wikitext GPT-2",
    dataType: "text",
    preTrained: false,
    contextLength: 64,
  },

  async getModel(): Promise<Model<"tabular">> {
    const model = new GPT({
      contextLength: this.card.contextLength,
    });

    return Promise.resolve(model);
  },
};
