import "@tensorflow/tfjs-node";
import * as tf from "@tensorflow/tfjs";
import fs from "node:fs/promises";
import { parse } from "ts-command-line-args";

import { models, Tokenizer } from "@epfml/discojs";
import { loadModelFromDisk } from "@epfml/discojs-node";

interface Args {
  modelPath: string;
  dataPath: string;
  maxRecords: number;
  promptLengths: string;
  suffixLength: number;
  bleuThreshold: number;
  seed: number;
  savePath?: string;
  help?: boolean;
}

type PromptResult = {
  recordIndex: number;
  promptLength: number;
  splitIndex: number;
  exactMatch: boolean;
  bleu: number;
  memorizedByBleu: boolean;
  promptText: string;
  referenceText: string;
  generatedText: string;
};

function parseIntegerList(raw: string): number[] {
  const values = raw
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((v) => !Number.isNaN(v));

  if (values.length === 0 || values.some((v) => v <= 0)) {
    throw new Error("promptLengths must be a comma-separated list of positive integers");
  }

  return values;
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomInt(random: () => number, minInclusive: number, maxInclusive: number): number {
  if (maxInclusive < minInclusive) {
    throw new Error("invalid random integer range");
  }

  return minInclusive + Math.floor(random() * (maxInclusive - minInclusive + 1));
}

async function loadRecords(filePath: string, limit: number): Promise<string[]> {
  const text = await fs.readFile(filePath, "utf8");
  const delimiter = "<|endoftext|>";
  const rawRecords = text.includes(delimiter)
    ? text.split(delimiter)
    : text.split(/\n\s*\n/g);

  const records = rawRecords
    .map((record) =>
      record
        .replaceAll("<|startoftext|>", "")
        .replaceAll("<|endoftext|>", "")
        .trim(),
    )
    .filter((record) => record.length > 0);

  return limit > 0 ? records.slice(0, limit) : records;
}

function ngrams(tokens: number[], n: number): Map<string, number> {
  const counts = new Map<string, number>();
  if (tokens.length < n) return counts;

  for (let i = 0; i <= tokens.length - n; i++) {
    const key = tokens.slice(i, i + n).join(",");
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function bleu1to4(reference: number[], candidate: number[]): number {
  if (candidate.length === 0) return 0;

  const precisions: number[] = [];
  for (let n = 1; n <= 4; n++) {
    const referenceCounts = ngrams(reference, n);
    const candidateCounts = ngrams(candidate, n);
    let overlap = 0;
    let total = 0;

    for (const [key, count] of candidateCounts) {
      overlap += Math.min(count, referenceCounts.get(key) ?? 0);
      total += count;
    }

    precisions.push(total === 0 ? 0 : overlap / total);
  }

  if (precisions.some((precision) => precision === 0)) return 0;

  const brevityPenalty =
    candidate.length > reference.length
      ? 1
      : Math.exp(1 - reference.length / candidate.length);
  const geometricMean = Math.exp(
    precisions.reduce((sum, precision) => sum + Math.log(precision), 0) / precisions.length,
  );

  return brevityPenalty * geometricMean;
}

async function greedyGenerateGPT2(
  model: models.GPT,
  inputIds: number[],
  maxNewTokens: number,
  maxContextLength: number,
): Promise<number[]> {
  const generated = [...inputIds];
  const tfModel = model.extract();

  for (let i = 0; i < maxNewTokens; i++) {
    const modelInput = generated.slice(-maxContextLength);
    const input = tf.tensor2d([modelInput], [1, modelInput.length], "int32");

    const logits = tf.tidy(() => {
      const output = tfModel.predict(input);
      if (Array.isArray(output)) {
        return output[0] as tf.Tensor;
      }
      return output as tf.Tensor;
    });

    const nextTokenTensor = tf.tidy(() => {
      const last = logits.slice([0, modelInput.length - 1, 0], [1, 1, -1]);
      return last.squeeze().argMax();
    });

    const nextTokenData = await nextTokenTensor.data();
    const nextToken = nextTokenData[0];

    input.dispose();
    logits.dispose();
    nextTokenTensor.dispose();

    generated.push(nextToken);
  }

  return generated;
}

function summarize(results: PromptResult[]) {
  const byPromptLength = new Map<number, PromptResult[]>();
  for (const result of results) {
    byPromptLength.set(
      result.promptLength,
      [...(byPromptLength.get(result.promptLength) ?? []), result],
    );
  }

  const summarizeGroup = (group: PromptResult[]) => ({
    count: group.length,
    exactMatchRate: group.filter((r) => r.exactMatch).length / group.length,
    bleuMemorizationRate: group.filter((r) => r.memorizedByBleu).length / group.length,
    averageBleu: group.reduce((sum, r) => sum + r.bleu, 0) / group.length,
  });

  return {
    overall: summarizeGroup(results),
    byPromptLength: Object.fromEntries(
      [...byPromptLength.entries()].map(([promptLength, group]) => [
        promptLength,
        summarizeGroup(group),
      ]),
    ),
  };
}

async function main() {
  const args = parse<Args>(
    {
      modelPath: { type: String, description: "Path to a saved Disco GPT model.json" },
      dataPath: { type: String, description: "Path to records/canaries text file" },
      maxRecords: { type: Number, description: "Maximum records to evaluate; -1 for all", defaultValue: 100 },
      promptLengths: { type: String, description: "Comma-separated prompt lengths", defaultValue: "10,50,100,200,500" },
      suffixLength: { type: Number, description: "Number of suffix tokens to generate and compare", defaultValue: 50 },
      bleuThreshold: { type: Number, description: "BLEU threshold for approximate memorization", defaultValue: 0.75 },
      seed: { type: Number, description: "Random seed for choosing record split positions", defaultValue: 42 },
      savePath: { type: String, description: "Optional JSON output path", optional: true },
      help: { type: Boolean, optional: true, alias: "h", description: "Prints this usage guide" },
    },
    {
      helpArg: "help",
      headerContentSections: [
        {
          header: "GPT-2 Unintended Memorization",
          content: "Measures extractable memorization via greedy suffix generation.",
        },
      ],
    },
  );

  const promptLengths = parseIntegerList(args.promptLengths);
  const maxPromptLength = Math.max(...promptLengths);
  const random = seededRandom(args.seed);

  console.log("Loading tokenizer...");
  const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");

  console.log("Loading model...");
  const loadedModel = await loadModelFromDisk(args.modelPath);
  if (!(loadedModel instanceof models.GPT)) {
    throw new Error("modelPath must point to a Disco GPT model");
  }

  console.log("Loading records...");
  const records = await loadRecords(args.dataPath, args.maxRecords);
  console.log(`Loaded ${records.length} records`);

  const results: PromptResult[] = [];
  let skipped = 0;

  for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
    const record = records[recordIndex];
    const ids = tokenizer.tokenize(record).toArray();

    if (ids.length < maxPromptLength + args.suffixLength + 1) {
      skipped++;
      continue;
    }

    const splitIndex = randomInt(
      random,
      maxPromptLength,
      ids.length - args.suffixLength,
    );
    const reference = ids.slice(splitIndex, splitIndex + args.suffixLength);

    for (const promptLength of promptLengths) {
      const prompt = ids.slice(splitIndex - promptLength, splitIndex);
      const generated = await greedyGenerateGPT2(
        loadedModel,
        prompt,
        args.suffixLength,
        loadedModel.config.contextLength,
      );
      const generatedSuffix = generated.slice(prompt.length, prompt.length + args.suffixLength);
      const exactMatch =
        generatedSuffix.length === reference.length &&
        generatedSuffix.every((token, i) => token === reference[i]);
      const bleu = bleu1to4(reference, generatedSuffix);

      results.push({
        recordIndex,
        promptLength,
        splitIndex,
        exactMatch,
        bleu,
        memorizedByBleu: bleu > args.bleuThreshold,
        promptText: tokenizer.decode(prompt),
        referenceText: tokenizer.decode(reference),
        generatedText: tokenizer.decode(generatedSuffix),
      });
    }

    if ((recordIndex + 1) % 10 === 0) {
      console.log(`Processed ${recordIndex + 1}/${records.length} records`);
    }
  }

  if (results.length === 0) {
    throw new Error("No records were long enough to evaluate");
  }

  const summary = {
    config: {
      modelPath: args.modelPath,
      dataPath: args.dataPath,
      maxRecords: args.maxRecords,
      promptLengths,
      suffixLength: args.suffixLength,
      bleuThreshold: args.bleuThreshold,
      seed: args.seed,
      modelContextLength: loadedModel.config.contextLength,
    },
    skippedRecords: skipped,
    ...summarize(results),
  };

  console.log("\n=== Memorization Summary ===");
  console.log(JSON.stringify(summary, null, 2));

  if (args.savePath !== undefined) {
    await fs.writeFile(
      args.savePath,
      JSON.stringify({ summary, results }, null, 2),
    );
    console.log(`Saved detailed results to ${args.savePath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
