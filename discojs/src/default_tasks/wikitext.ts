import type { TaskProvider } from "../index.js";
import { models, Task } from "../index.js";

export const wikitext: TaskProvider<'text'> = {
  async getTask() {
    return await Task.schemas.text.parseAsync({
      id: 'llm_task',
      dataType: "text",
      displayInformation: {
				title: "GPT Language Modeling",
        summary: {
          preview: 'Train a language model (L)LM in your browser, collaboratively and from scratch.',
          overview: "You can train a GPT-2 model in your browser and in a collaborative manner on any textual dataset. As an example, you can try the Wikitext-103 dataset, composed of Wikipedia articles, widely used in natural language modeling, which you can download <a class='underline text-blue-400' target='_blank' href='https://dax-cdn.cdn.appdomain.cloud/dax-wikitext-103/1.0.1/wikitext-103.tar.gz'>here</a>. More information on how to connect the dataset at the next step."
        },
        model: [
          "The model follows the exact GPT-2 architecture and is implemented in TensorFlow.js.",
          "The tokenizer used for preprocessing is the GPT-2 Byte-Pair encoding tokenizer.",
          "The model is trained via an Adam optimizer with unit gradient clipping and softmax cross-entropy loss.",
          "It has around 5M parameters.",
          "To accommodate all devices, the context length is currently kept at 128 and the batch size at 1.",
        ].join(" "),
        dataFormatInformation: 'You can use any natural language (text) dataset you like. For example the Wikitext-103 dataset is organized as a large text file, with each line representing a segment of raw text from Wikipedia articles.',
				dataExample:
					"For the first twenty years of its existence , the only staged performances of Parsifal took place in the Bayreuth Festspielhaus , the venue for which Wagner conceived the work ( except eight private performances for Ludwig II at Munich in 1884 and 1885 ) .",
				sampleDataset: {
					link: "https://storage.googleapis.com/deai-313515.appspot.com/wikitext.zip",
					instructions:
						'Opening the link should start downloading a zip file. Unzip it and drag and drop the training set named "wiki.train.tokens" in the field below (or use the "Select File" button). Even though the file extension is ".tokens" it is indeed a text file. You can use "wiki.test.tokens" at the evaluation step after training a language model.',
				},
      },
      trainingInformation: {
        scheme: 'federated',
        aggregationStrategy: 'mean',
        minNbOfParticipants: 2,
        epochs: 6,
        // Unused by wikitext because data already comes split
        // But if set to 0 then the webapp doesn't display the validation metrics
        validationSplit: 0.1, 
        roundDuration: 2,
        batchSize: 8, // If set too high firefox raises a WebGL error
        tokenizer: "Xenova/gpt2",
        contextLength: 64,
        tensorBackend: 'gpt'
      }
    });
  },

  async getModel() {
    const task = await this.getTask();

    return new models.GPT({
      contextLength: task.trainingInformation.contextLength,
    });
  },
}
