import { Model } from "#models/model";
import { ModelCard } from "#models/model_card";
import { GPT } from "#models/implementations/index";

export const Wikitext: ModelCard<"text"> = {
  card: {
    id: "wikitext",
    name: "Wikitext GPT-2",
    dataType: "text",
    contextLength: 64,
  },

  async getModel(): Promise<Model<"text">> {
    const model = new GPT({
      contextLength: this.card.contextLength,
    });

    return Promise.resolve(model);
  },
};
