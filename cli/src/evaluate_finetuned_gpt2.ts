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

async function scoreContinuation(
    tfModel: tf.LayersModel,
    tokenizer: Tokenizer,
    prompt: string,
    continuation: string,
    contextLength: number
): Promise<{ score: number; promptTokens: number; continuationTokens: number; usedInputTokens: number }> {
    const promptTokens = tokenizer.tokenize(prompt).toArray();
    const fullTokens = tokenizer.tokenize(prompt + continuation).toArray();
    const continuationTokens = fullTokens.length - promptTokens.length;

    const inputTokens = fullTokens.slice(0, -1);
    const offset = Math.max(0, inputTokens.length - contextLength);
    const truncatedInputTokens = inputTokens.slice(offset);

    if (truncatedInputTokens.length === 0 || continuationTokens <= 0) {
        return {
            score: Number.NEGATIVE_INFINITY,
            promptTokens: promptTokens.length,
            continuationTokens,
            usedInputTokens: truncatedInputTokens.length,
        };
    }

    const inputTensor = tf.tensor2d(
        [truncatedInputTokens],
        [1, truncatedInputTokens.length],
        "int32",
    );

    const logits = tfModel.predict(inputTensor) as tf.Tensor;
    const logProbs = tf.logSoftmax(logits, -1);
    const arr = await logProbs.array() as number[][][];

    let score = 0;
    let count = 0;

    for (let targetPos = promptTokens.length; targetPos < fullTokens.length; targetPos++) {
        const targetToken = fullTokens[targetPos];
        const logitPos = targetPos - 1 - offset;
        if (logitPos < 0 || logitPos >= arr[0].length) continue;
        score += arr[0][logitPos][targetToken];
        count++;
    }

    inputTensor.dispose();
    logits.dispose();
    logProbs.dispose();

    return {
        score: count === 0 ? Number.NEGATIVE_INFINITY : score / count,
        promptTokens: promptTokens.length,
        continuationTokens,
        usedInputTokens: truncatedInputTokens.length,
    };
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
        for (const opt of options) {
            const result = await scoreContinuation(
                tfModel,
                tokenizer,
                prompt,
                format.makeContinuation(opt),
                contextLength,
            );
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

        if (confusion[answer]) {
            confusion[answer][predicted]++;
        }

        const scoreMap = Object.fromEntries(
            options.map((opt, i) => [opt, scores[i]])
        );

        logs.push({
            predicted,
            answer,
            correct: predicted === answer,
            scores: scoreMap,
            promptTokens: tokenizer.tokenize(prompt).size,
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
