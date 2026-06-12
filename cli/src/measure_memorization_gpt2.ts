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
  decodingStrategy: DecodingStrategy;
  temperature: number;
  topK: number;
  seed: number;
  logEvery: number;
  savePath?: string;
  help?: boolean;
}

const DecodingStrategies = ["top-k", "greedy"] as const;
type DecodingStrategy = typeof DecodingStrategies[number];

type PromptResult = {
  recordIndex: number;
  recordTokenLength: number;
  promptLength: number;
  splitIndex: number;
  exactMatch: boolean;
  bleu: number;
  memorizedByBleu: boolean;
  promptText: string;
  referenceText: string;
  generatedText: string;
};

type TokenLengthStats = {
  min: number;
  p50: number;
  p90: number;
  max: number;
  average: number;
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

function castDecodingStrategy(raw: string): DecodingStrategy {
  for (const strategy of DecodingStrategies) {
    if (raw === strategy) return strategy;
  }

  throw new Error(`Invalid decodingStrategy: ${raw}`);
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

function summarizeTokenLengths(lengths: number[]): TokenLengthStats {
  if (lengths.length === 0) {
    return { min: 0, p50: 0, p90: 0, max: 0, average: 0 };
  }

  const sorted = [...lengths].sort((a, b) => a - b);
  const percentile = (p: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];

  return {
    min: sorted[0],
    p50: percentile(0.5),
    p90: percentile(0.9),
    max: sorted[sorted.length - 1],
    average: lengths.reduce((sum, length) => sum + length, 0) / lengths.length,
  };
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

async function sampleGenerateGPT2(
  model: models.GPT,
  inputIds: number[],
  maxNewTokens: number,
  maxContextLength: number,
  decodingStrategy: DecodingStrategy,
  temperature: number,
  topK: number,
  seed: number,
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
      const scaled = last.squeeze<tf.Tensor1D>().div(temperature);
      const { values: topKLogits, indices: topKTokens } = tf.topk(
        scaled,
        topK,
      );

      if (decodingStrategy === "greedy") {
        return topKTokens.gather(tf.scalar(0, "int32")).squeeze<tf.Scalar>();
      }

      const sampledIndex = tf.multinomial(
        topKLogits.expandDims<tf.Tensor2D>(0),
        1,
        seed + i,
        false,
      ).squeeze<tf.Scalar>();

      return topKTokens.gather(sampledIndex).squeeze<tf.Scalar>();
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
      decodingStrategy: {
        type: (raw: string) => castDecodingStrategy(raw),
        description: "Generation strategy: top-k or greedy",
        defaultValue: "top-k",
      },
      temperature: { type: Number, description: "Generation temperature used with top-k sampling", defaultValue: 0.8 },
      topK: { type: Number, description: "Number of most likely tokens considered for top-k sampling", defaultValue: 50 },
      seed: { type: Number, description: "Random seed for choosing record split positions", defaultValue: 42 },
      logEvery: { type: Number, description: "Print progress every N records; set 0 to disable per-record progress logs", defaultValue: 1 },
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
  if (!Number.isFinite(args.temperature) || args.temperature <= 0) {
    throw new Error("temperature must be a positive finite number");
  }
  if (!Number.isInteger(args.topK) || args.topK < 1) {
    throw new Error("topK must be a positive integer");
  }
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

  console.log("Tokenizing records...");
  const tokenizedRecords = records.map((record) => tokenizer.tokenize(record).toArray());
  const tokenLengths = tokenizedRecords.map((ids) => ids.length);
  const requiredTokensByPromptLength = Object.fromEntries(
    promptLengths.map((promptLength) => [
      promptLength,
      promptLength + args.suffixLength + 1,
    ]),
  );
  const eligibleRecordsByPromptLength = Object.fromEntries(
    promptLengths.map((promptLength) => [
      promptLength,
      tokenLengths.filter(
        (length) => length >= promptLength + args.suffixLength + 1,
      ).length,
    ]),
  );
  console.log("Token length stats:", summarizeTokenLengths(tokenLengths));
  console.log("Eligible records by prompt length:", eligibleRecordsByPromptLength);
  console.log("Starting memorization evaluation...");

  const results: PromptResult[] = [];
  let skipped = 0;
  const skippedByPromptLength: Record<string, number> = Object.fromEntries(
    promptLengths.map((promptLength) => [promptLength, 0]),
  );

  for (let recordIndex = 0; recordIndex < tokenizedRecords.length; recordIndex++) {
    const ids = tokenizedRecords[recordIndex];
    const eligiblePromptLengths = promptLengths.filter(
      (promptLength) => ids.length >= promptLength + args.suffixLength + 1,
    );
    const shouldLogRecord =
      args.logEvery > 0 &&
      (recordIndex === 0 ||
        (recordIndex + 1) % args.logEvery === 0 ||
        recordIndex === tokenizedRecords.length - 1);

    if (shouldLogRecord) {
      console.log(
        `Record ${recordIndex + 1}/${tokenizedRecords.length}: ${ids.length} tokens, eligible prompt lengths: ${eligiblePromptLengths.length > 0 ? eligiblePromptLengths.join(",") : "none"
        }`,
      );
    }

    for (const promptLength of promptLengths) {
      if (!eligiblePromptLengths.includes(promptLength)) {
        skippedByPromptLength[promptLength]++;
      }
    }

    if (eligiblePromptLengths.length === 0) {
      if (shouldLogRecord) {
        console.log(
          `Skipping record ${recordIndex + 1}; needs at least ${Math.min(...promptLengths) + args.suffixLength + 1
          } tokens for the shortest prompt/suffix setting.`,
        );
      }
      skipped++;
      continue;
    }

    const maxEligiblePromptLength = Math.max(...eligiblePromptLengths);
    const splitIndex = randomInt(
      random,
      maxEligiblePromptLength,
      ids.length - args.suffixLength,
    );
    const reference = ids.slice(splitIndex, splitIndex + args.suffixLength);

    for (const promptLength of eligiblePromptLengths) {
      if (shouldLogRecord) {
        console.log(
          `  Generating ${args.suffixLength} tokens for prompt length ${promptLength} at split ${splitIndex}...`,
        );
      }

      const prompt = ids.slice(splitIndex - promptLength, splitIndex);
      const generated = await sampleGenerateGPT2(
        loadedModel,
        prompt,
        args.suffixLength,
        loadedModel.config.contextLength,
        args.decodingStrategy,
        args.temperature,
        args.topK,
        args.seed + recordIndex + promptLength,
      );
      const generatedSuffix = generated.slice(prompt.length, prompt.length + args.suffixLength);

      console.log("================================");
      console.log("PROMPT LENGTH:", promptLength);

      console.log("\nPROMPT IDS:");
      console.log(prompt.slice(0, 30));

      console.log("\nGENERATED IDS:");
      console.log(generatedSuffix.slice(0, 30));

      console.log("\nREFERENCE IDS:");
      console.log(reference.slice(0, 30));

      console.log("\nPROMPT TEXT:");
      console.log(JSON.stringify(tokenizer.decode(prompt)));

      console.log("\nGENERATED TEXT:");
      console.log(JSON.stringify(tokenizer.decode(generatedSuffix)));

      console.log("\nREFERENCE TEXT:");
      console.log(JSON.stringify(tokenizer.decode(reference)));

      console.log("================================");

      const exactMatch =
        generatedSuffix.length === reference.length &&
        generatedSuffix.every((token, i) => token === reference[i]);
      const bleu = bleu1to4(reference, generatedSuffix);

      results.push({
        recordIndex,
        recordTokenLength: ids.length,
        promptLength,
        splitIndex,
        exactMatch,
        bleu,
        memorizedByBleu: bleu > args.bleuThreshold,
        promptText: tokenizer.decode(prompt),
        referenceText: tokenizer.decode(reference),
        generatedText: tokenizer.decode(generatedSuffix),
      });

      if (shouldLogRecord) {
        console.log(
          `  Done prompt length ${promptLength}: exact=${exactMatch}, BLEU=${bleu.toFixed(4)}`,
        );
      }
    }

    if (shouldLogRecord) {
      console.log(
        `Finished record ${recordIndex + 1}/${tokenizedRecords.length}; results so far: ${results.length}`,
      );
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
      decodingStrategy: args.decodingStrategy,
      temperature: args.temperature,
      topK: args.topK,
      seed: args.seed,
      logEvery: args.logEvery,
      modelContextLength: loadedModel.config.contextLength,
    },
    tokenLengthStats: summarizeTokenLengths(tokenLengths),
    requiredTokensByPromptLength,
    eligibleRecordsByPromptLength,
    skippedRecords: skipped,
    skippedByPromptLength,
    evaluatedRecords: new Set(results.map((result) => result.recordIndex)).size,
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
