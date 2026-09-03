import type { TaskProvider } from "#task/index";
import { Tokenizer, cards } from "#models/index";

export const goldfish: TaskProvider<"text", "federated"> = {
  async getTask() {
    return {
      id: "goldfish",
      dataType: "text",
      displayInformation: {
        title: "Privacy-Preserving Fine-tuning of GPT-2",
        summary: {
          preview:
            "Fine-tune a pre-trained GPT model collaboratively and privately with the Goldfish loss.",
          overview:
            "Fine-tune a pre-trained GPT-2 model created by the ONNX converter in your browser collaboratively without sharing your raw data. The model is loaded from Google Cloud Storage and fine-tuned using federated learning.",
        },
        model: [
          "The model is a pre-trained GPT-2 architecture converted from ONNX and loaded from Google Cloud Storage.",
          "The tokenizer used for preprocessing is the GPT-2 Byte-Pair encoding tokenizer.",
          "The model is trained via an Adam optimizer with unit gradient clipping and softmax cross-entropy loss.",
          "Context length is kept at 512 to match the pre-trained model, with batch size at 8.",
        ].join(" "),
        dataFormatInformation:
          "You can use any natural language (text) dataset. The dataset should be formatted as a plain text file with each line representing a segment of text.",
        dataExample:
          "For the first twenty years of its existence , the only staged performances of Parsifal took place in the Bayreuth Festspielhaus , the venue for which Wagner conceived the work.",
      },
      trainingInformation: {
        scheme: "federated",
        aggregationStrategy: "mean",
        minNbOfParticipants: 2,
        epochs: 1,
        validationSplit: 0.1,
        roundDuration: 1,
        // Last context segment may be shorter than context length, so it will be dropped (TODO: implement padding to avoid this)
        batchSize: 8,
        tokenizer: await Tokenizer.from_pretrained("Xenova/gpt2"),
        contextLength: 512,
        tensorBackend: "gpt",
        goldfishLoss: {
          enabled: true,
          k: 4,
          h: 13,
        },
      },
    };
  },
  modelCard: cards.Goldfish,
};
