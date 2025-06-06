import '@tensorflow/tfjs-node';
import fs from 'node:fs';
import path from 'node:path';
import { Tokenizer, models } from '@epfml/discojs';
import { loadHellaSwag } from '@epfml/discojs-node';

const logFile = path.join('..', 'datasets', 'LogFile_hellaswag.txt');
const logLines: string[] = [];

function log(message: string) {
    console.log(message);
    logLines.push(message);
}

const hellaswagDataset: models.HellaSwagDataset = await loadHellaSwag(-1)

async function evaluateTFJS(tokenizer: Tokenizer) {
    const model = new models.GPT({ seed: 42 });
    log('Evaluating TFJS GPT on HellaSwag...');

    const start = Date.now();
    const accuracy = await models.evaluate_hellaswag(model, tokenizer, hellaswagDataset, false);
    const duration = ((Date.now() - start) / 1000).toFixed(2);

    log(`TFJS GPT Accuracy: ${(accuracy * 100).toFixed(2)}%`);
    log(`TFJS GPT Evaluation Time: ${duration} seconds`);
}

async function evaluateXenova(tokenizer: Tokenizer) {
    const model = await models.ONNXModel.init_pretrained('Xenova/gpt2');
    log('Evaluating Xenova GPT-2 (ONNX) on HellaSwag...');

    const start = Date.now();
    const accuracy = await models.evaluate_hellaswag(model, tokenizer, hellaswagDataset, false);
    const duration = ((Date.now() - start) / 1000).toFixed(2);

    log(`Xenova GPT-2 Accuracy: ${(accuracy * 100).toFixed(2)}%`);
    log(`Xenova GPT-2 Evaluation Time: ${duration} seconds`);
}

async function main(): Promise<void> {
    fs.writeFileSync(logFile, '', 'utf-8'); // Clear old log file

    const tokenizer = await Tokenizer.from_pretrained('Xenova/gpt2');
    await evaluateTFJS(tokenizer);
    log('\n---\n');
    await evaluateXenova(tokenizer);

    fs.writeFileSync(logFile, logLines.join('\n'), 'utf-8');
    console.log(`\nResults written to ${logFile}`);
}

main().catch(console.error);
