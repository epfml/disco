import '@tensorflow/tfjs-node';
import { loadHellaSwag } from '@epfml/discojs-node';
import { models } from '@epfml/discojs';
import { AutoTokenizer, PreTrainedTokenizer } from '@xenova/transformers';
import fs from 'fs';
import path from 'node:path';

const logFile = path.join('..', 'datasets', 'LogFile_hellaswag.txt');
const logLines: string[] = [];

function log(message: string) {
    console.log(message);
    logLines.push(message);
}

const hellaswagDataset: models.HellaSwagDataset = await loadHellaSwag(-1)

async function evaluateTFJS(tokenizer: PreTrainedTokenizer) {
    const model = new models.GPT({ seed: 42 });
    log('Evaluating TFJS GPT on HellaSwag...');

    const start = Date.now();
    const accuracy = await models.evaluate_hellaswag(model, tokenizer, hellaswagDataset, false);
    const duration = ((Date.now() - start) / 1000).toFixed(2);

    log(`TFJS GPT Accuracy: ${(accuracy * 100).toFixed(2)}%`);
    log(`TFJS GPT Evaluation Time: ${duration} seconds`);
}

async function evaluateXenova(tokenizer: PreTrainedTokenizer) {
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

    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2');
    await evaluateTFJS(tokenizer);
    log('\n---\n');
    await evaluateXenova(tokenizer);

    fs.writeFileSync(logFile, logLines.join('\n'), 'utf-8');
    console.log(`\nResults written to ${logFile}`);
}

main().catch(console.error);
