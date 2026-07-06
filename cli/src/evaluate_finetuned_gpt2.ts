import "@tensorflow/tfjs-node";
import * as tf from "@tensorflow/tfjs";
import fs from "node:fs/promises";
import { parse } from "ts-command-line-args";
import { models, Tokenizer } from "@epfml/discojs";
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
// npm -w cli run eval_finetuned_gpt2 -- --modelPath absolute_path_to_model/model.json --testPath absolute_path_to_test_data/train_no_exp.txt --maxSamples 100

const PromptFormatNames = [
    "answer-colon-space",
    "answer-colon",
    "answer-newline",
] as const;

type PromptFormatName = typeof PromptFormatNames[number];

type PromptFormat = {
    name: PromptFormatName;
    makePrompt: (basePrompt: string) => string;
    makeContinuation: (option: string) => string;
};

const promptFormats: PromptFormat[] = [
    {
        name: "answer-colon-space",
        makePrompt: (basePrompt) => `${basePrompt}\nAnswer: `,
        makeContinuation: (option) => option,
    },
    {
        name: "answer-colon",
        makePrompt: (basePrompt) => `${basePrompt}\nAnswer:`,
        makeContinuation: (option) => ` ${option}`,
    },
    {
        name: "answer-newline",
        makePrompt: (basePrompt) => `${basePrompt}\nAnswer:\n`,
        makeContinuation: (option) => option,
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

function predictTokenLogits(tfModel: tf.LayersModel, inputTensor: tf.Tensor2D): tf.Tensor3D {
    const logits = tfModel.predict(inputTensor);
    if (Array.isArray(logits)) {
        throw new Error("Expected GPT model to return a single logits tensor");
    }
    if (logits.rank !== 3) {
        logits.dispose();
        throw new Error(`Expected GPT logits to have rank 3, got rank ${logits.rank}`);
    }
    return logits as tf.Tensor3D;
}

async function loadDataset(filePath: string, limit = -1): Promise<string[]> {
    const text = await fs.readFile(filePath, "utf-8");
    const samples = text
        .split("<|endoftext|>")
        .map((sample) =>
            sample
                .replaceAll("<|startoftext|>", "")
                .trim(),
        )
        .filter((sample) => sample !== "");

    return limit === -1 ? samples : samples.slice(0, limit);
}

function parseSample(sample: string) {
    const lines = sample.split("\n");

    let answer = "";
    const promptLines: string[] = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Answer:")) {
            answer = trimmed.replace("Answer:", "").trim().charAt(0).toUpperCase();
        } else {
            promptLines.push(line);
        }
    }

    const basePrompt = promptLines.join("\n").trim();
    return { basePrompt, answer };
}

async function scoreContinuations(
    tfModel: tf.LayersModel,
    tokenizer: Tokenizer,
    prompt: string,
    continuations: string[],
    contextLength: number
): Promise<{ score: number; promptTokens: number; continuationTokens: number; usedInputTokens: number }[]> {
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
        (maxLength, scoredInput) => Math.max(maxLength, scoredInput.truncatedInputTokens.length),
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

    const canScoreFromPromptOnly = scoredInputs.every(
        ({ continuationStart, continuationTokens }) =>
            continuationStart === promptTokens.length && continuationTokens === 1,
    );

    if (canScoreFromPromptOnly) {
        const offset = Math.max(0, promptTokens.length - contextLength);
        const truncatedPromptTokens = promptTokens.slice(offset);

        if (truncatedPromptTokens.length === 0) {
            return scoredInputs.map((scoredInput) => ({
                score: Number.NEGATIVE_INFINITY,
                promptTokens: promptTokens.length,
                continuationTokens: scoredInput.continuationTokens,
                usedInputTokens: truncatedPromptTokens.length,
            }));
        }

        const inputTensor = tf.tensor2d(
            [truncatedPromptTokens],
            [1, truncatedPromptTokens.length],
            "int32",
        );

        const optionScores = tf.tidy(() => {
            const logits = predictTokenLogits(tfModel, inputTensor);
            const lastLogits = logits
                .slice([0, truncatedPromptTokens.length - 1, 0], [1, 1, -1])
                .reshape<tf.Tensor1D>([-1]);
            const logProbs = tf.logSoftmax(lastLogits);
            const continuationTokenIds = scoredInputs.map(
                ({ fullTokens, continuationStart }) => fullTokens[continuationStart],
            );
            return tf.gather(logProbs, continuationTokenIds);
        });

        const scores = await optionScores.array();

        inputTensor.dispose();
        optionScores.dispose();

        return scoredInputs.map((scoredInput, index) => ({
            score: scores[index],
            promptTokens: promptTokens.length,
            continuationTokens: scoredInput.continuationTokens,
            usedInputTokens: truncatedPromptTokens.length,
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
        const {
            fullTokens,
            continuationStart,
            offset,
            truncatedInputTokens,
        } = scoredInput;

        // Usually A/B/C/D is one token and the prompt-only fast path above handles it.
        // Keep this fallback for prompt/continuation tokenizer merges and multi-token labels.
        for (let targetPos = continuationStart; targetPos < fullTokens.length; targetPos++) {
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

    const targetScores = await targetLogProbs.array() as number[];
    const scoreSums = Array(scoredInputs.length).fill(0) as number[];
    const scoreCounts = Array(scoredInputs.length).fill(0) as number[];

    targetScores.forEach((score, index) => {
        const owner = targetOwners[index];
        scoreSums[owner] += score;
        scoreCounts[owner]++;
    });

    const results = scoredInputs.map((scoredInput, index) => {
        return {
            score: scoreCounts[index] === 0
                ? Number.NEGATIVE_INFINITY
                : scoreSums[index] / scoreCounts[index],
            promptTokens: promptTokens.length,
            continuationTokens: scoredInput.continuationTokens,
            usedInputTokens: scoredInput.truncatedInputTokens.length,
        };
    });

    inputTensor.dispose();
    logits.dispose();
    targetLogProbs.dispose();

    return results;
}

async function benchmarkQA(
    model: models.GPT,
    tokenizer: Tokenizer,
    dataset: string[],
    format: PromptFormat,
    contextLength: number,
    savePath?: string
): Promise<number> {
    console.log(`=== QA LOGPROB BENCHMARK (${format.name}) ===`);
    console.log(`Context length: ${contextLength}`);

    const tfModel = model.extract();

    let correct = 0;
    let total = 0;

    const options = ["A", "B", "C", "D"];

    const confusion: Record<string, Record<string, number>> = {
        A: { A: 0, B: 0, C: 0, D: 0 },
        B: { A: 0, B: 0, C: 0, D: 0 },
        C: { A: 0, B: 0, C: 0, D: 0 },
        D: { A: 0, B: 0, C: 0, D: 0 }
    };

    type PredictionLog = {
        predicted: string;
        answer: string;
        correct: boolean;
        scores: Record<string, number>;
        promptTokens: number;
        continuationTokens: Record<string, number>;
        usedInputTokens: Record<string, number>;
    };

    const logs: PredictionLog[] = [];

    const start = Date.now();

    for (const sample of dataset) {
        const { basePrompt, answer } = parseSample(sample);

        if (!options.includes(answer)) {
            console.log("Invalid answer:", JSON.stringify(answer));
            continue;
        }

        const prompt = format.makePrompt(basePrompt);

        const scores: number[] = [];
        const continuationTokens: number[] = [];
        const usedInputTokens: number[] = [];
        const results = await scoreContinuations(
            tfModel,
            tokenizer,
            prompt,
            options.map((opt) => format.makeContinuation(opt)),
            contextLength,
        );

        for (const result of results) {
            scores.push(result.score);
            continuationTokens.push(result.continuationTokens);
            usedInputTokens.push(result.usedInputTokens);
        }

        let bestIdx = 0;
        for (let i = 1; i < scores.length; i++) {
            if (scores[i] > scores[bestIdx]) bestIdx = i;
        }

        const predicted = options[bestIdx];

        if (predicted === answer) correct++;
        total++;

        if (confusion[answer]?.[predicted] === undefined) {
            throw new Error(`Unexpected confusion matrix key: answer=${answer}, predicted=${predicted}`);
        }
        confusion[answer][predicted]++;

        const scoreMap = Object.fromEntries(
            options.map((opt, i) => [opt, scores[i]])
        );

        logs.push({
            predicted,
            answer,
            correct: predicted === answer,
            scores: scoreMap,
            promptTokens: results[0]?.promptTokens ?? tokenizer.tokenize(prompt).size,
            continuationTokens: Object.fromEntries(
                options.map((opt, i) => [opt, continuationTokens[i]])
            ),
            usedInputTokens: Object.fromEntries(
                options.map((opt, i) => [opt, usedInputTokens[i]])
            ),
        });

        if (total % 50 === 0) {
            console.log(`Processed ${total} samples...`);
        }
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
    for (const cls of options) {
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
        help: { type: Boolean, optional: true }
    });

    console.log("Loading tokenizer...");
    const tokenizer = await Tokenizer.from_pretrained("Xenova/gpt2");

    console.log("Loading model...");
    const model = await loadModelFromDisk(args.modelPath);

    if (!(model instanceof models.GPT)) {
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

        await benchmarkQA(model, tokenizer, dataset, format, contextLength, savePath);
    }

    console.log("Done.");
}

main().catch(console.error);
