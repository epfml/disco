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
    help?: boolean;
}

// HOW TO RUN
// npm -w cli run eval_finetuned_gpt2 -- --modelPath absolute_path_to_model/model.json --testPath absolute_path_to_test_data/train_no_exp.txt --maxSamples 100

async function loadDataset(filePath: string, limit = -1): Promise<string[]> {
    const text = await fs.readFile(filePath, "utf-8");
    const lines = text.split("\n");

    const samples: string[] = [];
    let current = "";

    for (const line of lines) {
        const l = line.trim();

        if (l.includes("<|startoftext|>")) {
            current = "";
        } else if (l.includes("<|endoftext|>")) {
            samples.push(current.trim());
            if (limit !== -1 && samples.length >= limit) break;
        } else {
            current += l + "\n";
        }
    }

    return samples;
}

function parseSample(sample: string) {
    const lines = sample.split("\n");

    let answer = "";
    const promptLines: string[] = [];

    for (const line of lines) {
        if (line.startsWith("Answer:")) {
            answer = line.replace("Answer:", "").trim().charAt(0).toUpperCase();
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
    continuation: string
): Promise<number> {
    const promptTokens = tokenizer.tokenize(prompt).toArray();
    const fullTokens = tokenizer.tokenize(prompt + continuation).toArray();

    const inputTokens = fullTokens.slice(0, -1);
    const inputTensor = tf.tensor2d([inputTokens], [1, inputTokens.length], "int32");

    const logits = tfModel.predict(inputTensor) as tf.Tensor;
    const logProbs = tf.logSoftmax(logits, -1);
    const arr = await logProbs.array() as number[][][];

    let score = 0;
    let count = 0;

    for (let targetPos = promptTokens.length; targetPos < fullTokens.length; targetPos++) {
        const targetToken = fullTokens[targetPos];
        score += arr[0][targetPos - 1][targetToken];
        count++;
    }

    inputTensor.dispose();
    logits.dispose();
    logProbs.dispose();

    return score / count;
}

async function benchmarkQA(
    model: models.GPT,
    tokenizer: Tokenizer,
    dataset: string[],
    savePath?: string
) {
    console.log("=== QA LOGPROB BENCHMARK ===");

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
    };

    const logs: PredictionLog[] = [];

    const start = Date.now();

    for (const sample of dataset) {
        const { basePrompt, answer } = parseSample(sample);

        if (!options.includes(answer)) {
            console.log("Invalid answer:", JSON.stringify(answer));
            continue;
        }

        const prompt = `${basePrompt}\nAnswer:`;

        const scores: number[] = [];
        for (const opt of options) {
            scores.push(await scoreContinuation(tfModel, tokenizer, prompt, ` ${opt}`));
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
            scores: scoreMap
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
}

async function main() {
    const args = parse<Args>({
        modelPath: { type: String },
        testPath: { type: String },
        maxSamples: { type: Number, optional: true, defaultValue: 100 },
        savePath: { type: String, optional: true },
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

    await benchmarkQA(model, tokenizer, dataset, args.savePath);

    console.log("Done.");
}

main().catch(console.error);