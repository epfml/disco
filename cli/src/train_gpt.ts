import "@tensorflow/tfjs-node"
import { AutoTokenizer } from "@xenova/transformers";
import { models, processing, Dataset } from "@epfml/discojs";
import { List } from "immutable";

async function main(): Promise<void> { 
  const data = "Lorem ipsum dolor sit amet, consectetur adipis"
  const seed = 42

  const config: models.GPTConfig = {
    modelType: 'gpt-nano',
    lr: 0.01,
    maxIter: 50,
    evaluateEvery:50,
    maxEvalBatches: 10,
    contextLength: 16,
    seed
  }

  const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')

  const tokenDataset = new Dataset([data])
    .map((text: string) => processing.tokenize(tokenizer, text))
    .flatten()
    .batch(config.contextLength + 1, 1)
    .map((tokens) => [tokens.pop(), tokens.last()] as [List<number>, number])
    .repeat()
    .batch(8);
  
  const model = new models.GPT(config)
  for await (const logs of model.train(tokenDataset, undefined)) {
    console.log(logs)
  }

  let tokens = processing.tokenize(tokenizer, "Lorem");

  const maxNewTokens = 14
  for (let n = 0; n < maxNewTokens; n++) {
		const next = (await model.predict(List.of(tokens), { seed })).first();
		if (next === undefined) throw new Error("empty prediction");
    tokens = tokens.push(next)
  }
  const generation = tokenizer.decode(tokens.toArray(), { skip_special_tokens: true })
  console.log(generation)
}

// You can run this example with "npm run run_gpt" from this folder
main().catch(console.error)