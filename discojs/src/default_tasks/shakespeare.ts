import type { TaskProvider } from "#task/index";
import { Tokenizer, cards } from "#models/index";

export const shakespeare: TaskProvider<"text", "decentralized"> = {
  async getTask() {
    return {
      id: "shakespeare",
      dataType: "text",
      displayInformation: {
        title: "Shakespeare Language Modeling",
        summary: {
          preview:
            "Train a small GPT language model collaboratively on a compact Shakespeare text corpus.",
          overview:
            "This task uses Tiny Shakespeare, a single plain-text file of about 1.1 MB. Split the text between participants to train a GPT model through decentralized learning.",
        },
        model:
          "A GPT-2-style Transformer implemented in TensorFlow.js, trained from scratch with the GPT-2 tokenizer, a context length of 64, and a batch size of 8.",
        dataFormatInformation:
          "Provide a UTF-8 plain-text file. Each line is a segment of text. Participants can use different portions of the sample corpus.",
        dataExample:
          "First Citizen: Before we proceed any further, hear me speak.",
        sampleDataset: {
          link: "https://raw.githubusercontent.com/karpathy/char-rnn/master/data/tinyshakespeare/input.txt",
          instructions:
            "Download the text file and select it below. For collaborative training, give each participant a different portion of the file.",
        },
      },
      trainingInformation: {
        scheme: "decentralized",
        aggregationStrategy: "mean",
        minNbOfParticipants: 2,
        maxConnectionRetry: 3,
        maxPeerConnectionTime: 60_000,
        maxModelSyncTime: 60_000,
        epochs: 1,
        roundDuration: 1,
        validationSplit: 0,
        batchSize: 8,
        tokenizer: await Tokenizer.from_pretrained("Xenova/gpt2"),
        contextLength: 64,
        tensorBackend: "gpt",
      },
    };
  },

  modelCard: cards.Shakespeare,
};
