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

// =========================
// HOW TO RUN
// =========================
// npm -w cli run eval_finetuned_gpt2 -- --modelPath absolute_path_to_model/model.json --testPath absolute_path_to_test_data/train_no_exp.txt --maxSamples 100

// =========================
// LOAD DATASET
// =========================
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

// =========================
// PARSE SAMPLE
// =========================
function parseSample(sample: string) {
    const lines = sample.split("\n");

    let answer = "";
    const promptLines: string[] = [];

    for (const line of lines) {
        if (line.startsWith("Answer:")) {
            answer = line.replace("Answer:", "").trim();
        } else {
            promptLines.push(line);
        }
    }

    const basePrompt = promptLines.join("\n");
    return { basePrompt, answer };
}

// =========================
// SOFTMAX (for safety)
// =========================
async function scoreText(
    tfModel: tf.LayersModel,
    tokenizer: Tokenizer,
    text: string
): Promise<number> {
    const tokens = tokenizer.tokenize(text);

    if (tokens.size < 2) return -Infinity;

    const inputTokens = tokens.slice(0, tokens.size - 1).toArray();
    const targets = tokens.slice(1).toArray();

    const inputTensor = tf.tensor([inputTokens], [1, inputTokens.length], "int32");

    const logits = tfModel.predict(inputTensor) as tf.Tensor;
    const logitsArray = await logits.array() as number[][][];

    let score = 0;

    for (let i = 0; i < targets.length; i++) {
        const stepLogits = logitsArray[0][i];

        const logit = stepLogits[targets[i]] ?? -100;

        score += logit;
    }

    inputTensor.dispose();
    logits.dispose();

    return score;
}

// =========================
// SCORE OPTIONS
// =========================
async function scoreOptions(
    tfModel: tf.LayersModel,
    tokenizer: Tokenizer,
    texts: string[]
): Promise<number[]> {
    const scores: number[] = [];

    for (const t of texts) {
        const s = await scoreText(tfModel, tokenizer, t);
        scores.push(s);
    }

    return scores;
}

// =========================
// BENCHMARK
// =========================
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

    const logs: any[] = [];

    const start = Date.now();

    for (const sample of dataset) {
        const { basePrompt, answer } = parseSample(sample);

        const texts = options.map(
            (opt) => `${basePrompt}\nAnswer: ${opt}`
        );

        const scores = await scoreOptions(tfModel, tokenizer, texts);

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

        logs.push({
            predicted,
            answer,
            correct: predicted === answer
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

// =========================
// MAIN
// =========================
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