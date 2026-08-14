import { Model, ModelCard } from "../index.js";
import { GPT } from "../index.js";

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
