import "@tensorflow/tfjs-node";
import * as tf from "@tensorflow/tfjs";
import fs from "node:fs/promises";
import { parse } from "ts-command-line-args";
import { GPT, Tokenizer } from "@epfml/discojs";
import { loadModelFromDisk } from "@epfml/discojs-node";

interface Args {
  modelPath: string;
  testPath: string;
  maxSamples?: number;
  savePath?: string;
  compareFormats?: boolean;
  promptFormat?: PromptFormatName;
  contextLength?: number;
  help?: boolean;
}

// HOW TO RUN
// npm -w cli run eval_finetuned_gpt2_full_answer -- --modelPath absolute_path_to_model/model.json --testPath absolute_path_to_test_data/test.txt --maxSamples 100

const PromptFormatNames = [
  "answer-colon-space",
  "answer-colon",
  "answer-newline",
] as const;

type PromptFormatName = (typeof PromptFormatNames)[number];

type PromptFormat = {
  name: PromptFormatName;
  makePrompt: (basePrompt: string) => string;
  makeContinuation: (answer: string) => string;
};

type Option = {
  label: string;
  answer: string;
};

type ParsedSample = {
  basePrompt: string;
  answerLabel: string;
  answer: string;
  options: Option[];
};

type ScoreResult = {
  score: number;
  promptTokens: number;
  continuationTokens: number;
  usedInputTokens: number;
};

const promptFormats: PromptFormat[] = [
  {
    name: "answer-colon-space",
    makePrompt: (basePrompt) => `${basePrompt}\nAnswer: `,
    makeContinuation: (answer) => answer,
  },
  {
    name: "answer-colon",
    makePrompt: (basePrompt) => `${basePrompt}\nAnswer:`,
    makeContinuation: (answer) => ` ${answer}`,
  },
  {
    name: "answer-newline",
    makePrompt: (basePrompt) => `${basePrompt}\nAnswer:\n`,
    makeContinuation: (answer) => answer,
  },
];

function castPromptFormatName(raw: string): PromptFormatName {
  for (const name of PromptFormatNames) {
    if (raw === name) return name;
  }
  throw new Error(`Invalid promptFormat: ${raw}`);
}

function commonPrefixLength(left: number[], right: number[]): number {
  const maxLength = Math.min(left.length, right.length);

  for (let i = 0; i < maxLength; i++) {
    if (left[i] !== right[i]) return i;
  }

  return maxLength;
}

function predictTokenLogits(
  tfModel: tf.LayersModel,
  inputTensor: tf.Tensor2D,
): tf.Tensor3D {
  const logits = tfModel.predict(inputTensor);
  if (Array.isArray(logits)) {
    throw new Error("Expected GPT model to return a single logits tensor");
  }
  if (logits.rank !== 3) {
    logits.dispose();
    throw new Error(
      `Expected GPT logits to have rank 3, got rank ${logits.rank}`,
    );
  }
  return logits as tf.Tensor3D;
}

async function loadDataset(filePath: string, limit = -1): Promise<string[]> {
  const text = await fs.readFile(filePath, "utf-8");
  const samples = text
    .split("<|endoftext|>")
    .map((sample) => sample.replaceAll("<|startoftext|>", "").trim())
    .filter((sample) => sample !== "");

  return limit === -1 ? samples : samples.slice(0, limit);
}

function parseAnswerLine(
  line: string,
): { label: string; answer?: string } | undefined {
  const match = line.trim().match(/^Answer:\s*([A-D])(?:\.\s*(.*))?$/i);
  if (match === null) return undefined;

  const label = match[1].toUpperCase();
  const answerText = match[2]?.trim();

  return {
    label,
    answer:
      answerText === undefined || answerText === ""
        ? undefined
        : `${label}. ${answerText}`,
  };
}

function parseOptionLine(line: string): Option | undefined {
  const match = line.trim().match(/^([A-D])\.\s*(.+)$/i);
  if (match === null) return undefined;

  const label = match[1].toUpperCase();
  return {
    label,
    answer: `${label}. ${match[2].trim()}`,
  };
}

function parseSample(sample: string): ParsedSample {
  const lines = sample.split("\n");

  let answerLabel = "";
  let answerFromLine: string | undefined;
  const promptLines: string[] = [];
  const options: Option[] = [];

  for (const line of lines) {
    const answer = parseAnswerLine(line);
    if (answer !== undefined) {
      answerLabel = answer.label;
      answerFromLine = answer.answer;
      continue;
    }

    const option = parseOptionLine(line);
    if (option !== undefined) {
      options.push(option);
    }

    promptLines.push(line);
  }

  const correctOption = options.find((option) => option.label === answerLabel);
  if (correctOption === undefined) {
    throw new Error(
      `Could not match answer label ${JSON.stringify(answerLabel)} to an option`,
    );
  }

  if (answerFromLine !== undefined && answerFromLine !== correctOption.answer) {
    throw new Error(
      `Answer line ${JSON.stringify(answerFromLine)} does not match option ${JSON.stringify(correctOption.answer)}`,
    );
  }

  const basePrompt = promptLines.join("\n").trim();
  return {
    basePrompt,
    answerLabel,
    answer: correctOption.answer,
    options,
  };
}

function validateOptions(options: Option[], expectedLabels: string[]): boolean {
  if (options.length !== expectedLabels.length) return false;

  const labels = options.map((option) => option.label);
  return (
    expectedLabels.every((label) => labels.includes(label)) &&
    new Set(labels).size === expectedLabels.length
  );
}

async function scoreContinuations(
  tfModel: tf.LayersModel,
  tokenizer: Tokenizer,
  prompt: string,
  continuations: string[],
  contextLength: number,
): Promise<ScoreResult[]> {
  const promptTokens = tokenizer.tokenize(prompt).toArray();
  const scoredInputs = continuations.map((continuation) => {
    const fullTokens = tokenizer.tokenize(prompt + continuation).toArray();
    const continuationStart = commonPrefixLength(promptTokens, fullTokens);
    const continuationTokens = fullTokens.length - continuationStart;
    const inputTokens = fullTokens.slice(0, -1);
    const offset = Math.max(0, inputTokens.length - contextLength);
    const truncatedInputTokens = inputTokens.slice(offset);

    return {
      fullTokens,
      continuationStart,
      continuationTokens,
      offset,
      truncatedInputTokens,
    };
  });

  const maxInputLength = scoredInputs.reduce(
    (maxLength, scoredInput) =>
      Math.max(maxLength, scoredInput.truncatedInputTokens.length),
    0,
  );

  if (maxInputLength === 0) {
    return scoredInputs.map((scoredInput) => ({
      score: Number.NEGATIVE_INFINITY,
      promptTokens: promptTokens.length,
      continuationTokens: scoredInput.continuationTokens,
      usedInputTokens: scoredInput.truncatedInputTokens.length,
    }));
  }

  const paddedInputs = scoredInputs.map(({ truncatedInputTokens }) => [
    ...truncatedInputTokens,
    ...Array(maxInputLength - truncatedInputTokens.length).fill(0),
  ]);

  const inputTensor = tf.tensor2d(
    paddedInputs,
    [paddedInputs.length, maxInputLength],
    "int32",
  );

  const targetIndexes: number[][] = [];
  const targetTokenIds: number[] = [];
  const targetOwners: number[] = [];

  scoredInputs.forEach((scoredInput, batchIdx) => {
    const { fullTokens, continuationStart, offset, truncatedInputTokens } =
      scoredInput;

    // Same ranking as HellaSwag's mean continuation cross-entropy:
    // maximize mean log-probability instead of minimizing its negative.
    for (
      let targetPos = continuationStart;
      targetPos < fullTokens.length;
      targetPos++
    ) {
      const targetToken = fullTokens[targetPos];
      const logitPos = targetPos - 1 - offset;
      if (logitPos < 0 || logitPos >= truncatedInputTokens.length) continue;
      targetIndexes.push([batchIdx, logitPos]);
      targetTokenIds.push(targetToken);
      targetOwners.push(batchIdx);
    }
  });

  if (targetIndexes.length === 0) {
    inputTensor.dispose();
    return scoredInputs.map((scoredInput) => ({
      score: Number.NEGATIVE_INFINITY,
      promptTokens: promptTokens.length,
      continuationTokens: scoredInput.continuationTokens,
      usedInputTokens: scoredInput.truncatedInputTokens.length,
    }));
  }

  const logits = predictTokenLogits(tfModel, inputTensor);
  const targetLogProbs = tf.tidy(() => {
    const targetIndexTensor = tf.tensor2d(
      targetIndexes,
      [targetIndexes.length, 2],
      "int32",
    );
    const targetTokenIndexTensor = tf.tensor2d(
      targetTokenIds.map((targetTokenId, index) => [index, targetTokenId]),
      [targetTokenIds.length, 2],
      "int32",
    );
    const targetLogits = tf.gatherND(logits, targetIndexTensor) as tf.Tensor2D;
    const logProbs = tf.logSoftmax(targetLogits, -1);
    return tf.gatherND(logProbs, targetTokenIndexTensor);
  });

  const targetScores = (await targetLogProbs.array()) as number[];
  const scoreSums = Array(scoredInputs.length).fill(0) as number[];
  const scoreCounts = Array(scoredInputs.length).fill(0) as number[];

  targetScores.forEach((score, index) => {
    const owner = targetOwners[index];
    scoreSums[owner] += score;
    scoreCounts[owner]++;
  });

  const results = scoredInputs.map((scoredInput, index) => ({
    score:
      scoreCounts[index] === 0
        ? Number.NEGATIVE_INFINITY
        : scoreSums[index] / scoreCounts[index],
    promptTokens: promptTokens.length,
    continuationTokens: scoredInput.continuationTokens,
    usedInputTokens: scoredInput.truncatedInputTokens.length,
  }));

  inputTensor.dispose();
  logits.dispose();
  targetLogProbs.dispose();

  return results;
}

async function benchmarkFullAnswers(
  model: GPT,
  tokenizer: Tokenizer,
  dataset: string[],
  format: PromptFormat,
  contextLength: number,
  savePath?: string,
): Promise<number> {
  console.log(`=== FULL ANSWER LOGPROB BENCHMARK (${format.name}) ===`);
  console.log(`Context length: ${contextLength}`);

  const tfModel = model.extract();

  let correct = 0;
  let total = 0;
  const labels = ["A", "B", "C", "D"];
  const confusion: Record<string, Record<string, number>> = Object.fromEntries(
    labels.map((label) => [
      label,
      Object.fromEntries(labels.map((otherLabel) => [otherLabel, 0])),
    ]),
  );

  type PredictionLog = {
    predicted: string;
    predictedAnswer: string;
    answer: string;
    answerText: string;
    correct: boolean;
    scores: Record<string, number>;
    promptTokens: number;
    continuationTokens: Record<string, number>;
    usedInputTokens: Record<string, number>;
  };

  const logs: PredictionLog[] = [];
  const start = Date.now();

  for (const sample of dataset) {
    let parsed: ParsedSample;
    try {
      parsed = parseSample(sample);
    } catch (error) {
      console.log(
        "Invalid sample:",
        error instanceof Error ? error.message : error,
      );
      continue;
    }

    if (!validateOptions(parsed.options, labels)) {
      console.log(
        "Invalid options:",
        parsed.options.map((option) => option.label).join(", "),
      );
      continue;
    }

    const prompt = format.makePrompt(parsed.basePrompt);
    const results = await scoreContinuations(
      tfModel,
      tokenizer,
      prompt,
      parsed.options.map((option) => format.makeContinuation(option.answer)),
      contextLength,
    );

    const scores = results.map((result) => result.score);
    let bestIdx = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] > scores[bestIdx]) bestIdx = i;
    }

    const predicted = parsed.options[bestIdx];
    if (predicted.label === parsed.answerLabel) correct++;
    total++;

    if (confusion[parsed.answerLabel]?.[predicted.label] === undefined) {
      throw new Error(
        `Unexpected confusion matrix key: answer=${parsed.answerLabel}, predicted=${predicted.label}`,
      );
    }
    confusion[parsed.answerLabel][predicted.label]++;

    logs.push({
      predicted: predicted.label,
      predictedAnswer: predicted.answer,
      answer: parsed.answerLabel,
      answerText: parsed.answer,
      correct: predicted.label === parsed.answerLabel,
      scores: Object.fromEntries(
        parsed.options.map((option, i) => [option.label, scores[i]]),
      ),
      promptTokens: results[0]?.promptTokens ?? tokenizer.tokenize(prompt).size,
      continuationTokens: Object.fromEntries(
        parsed.options.map((option, i) => [
          option.label,
          results[i].continuationTokens,
        ]),
      ),
      usedInputTokens: Object.fromEntries(
        parsed.options.map((option, i) => [
          option.label,
          results[i].usedInputTokens,
        ]),
      ),
    });

    if (total % 50 === 0) {
      console.log(`Processed ${total} samples...`);
    }
  }

  if (total === 0) {
    throw new Error("No valid samples were evaluated");
  }

  const accuracy = correct / total;
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  console.log("\n=========================");
  console.log(`Accuracy: ${(accuracy * 100).toFixed(2)}%`);
  console.log(`Time: ${duration}s`);
  console.log("=========================\n");

  console.log("Confusion Matrix:");
  console.table(confusion);

  console.log("\nPer-class accuracy:");
  for (const cls of labels) {
    const totalCls = Object.values(confusion[cls]).reduce((a, b) => a + b, 0);
    const correctCls = confusion[cls][cls];
    const acc = totalCls ? (correctCls / totalCls) * 100 : 0;

    console.log(`${cls}: ${acc.toFixed(2)}%`);
  }

  if (savePath) {
    await fs.writeFile(savePath, JSON.stringify(logs, null, 2));
    console.log(`Saved results to ${savePath}`);
  }

  return accuracy;
}

async function main() {
  const args = parse<Args>({
    modelPath: { type: String },
    testPath: { type: String },
    maxSamples: { type: Number, optional: true, defaultValue: 100 },
    savePath: { type: String, optional: true },
    compareFormats: { type: Boolean, optional: true, defaultValue: false },
    promptFormat: {
      type: (raw: string) => castPromptFormatName(raw),
      optional: true,
      defaultValue: "answer-colon-space",
    },
    contextLength: { type: Number, optional: true },
    help: { type: Boolean, optional: true },
  });

  console.log("Loading tokenizer...");
  const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");

  console.log("Loading model...");
  const model = await loadModelFromDisk(args.modelPath);

  if (!(model instanceof GPT)) {
    throw new Error("Model must be GPT");
  }

  console.log("Loading dataset...");
  const dataset = await loadDataset(args.testPath, args.maxSamples);

  console.log(`Loaded ${dataset.length} samples`);

  const contextLength = args.contextLength ?? model.config.contextLength;
  const formats = args.compareFormats
    ? promptFormats
    : promptFormats.filter((format) => format.name === args.promptFormat);

  for (const format of formats) {
    const savePath =
      args.savePath === undefined || formats.length === 1
        ? args.savePath
        : args.savePath.replace(/(\.[^.]+)?$/, `.${format.name}$1`);

    await benchmarkFullAnswers(
      model,
      tokenizer,
      dataset,
      format,
      contextLength,
      savePath,
    );
  }

  console.log("Done.");
}

main().catch(console.error);
