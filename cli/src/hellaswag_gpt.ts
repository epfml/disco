import '@tensorflow/tfjs-node';
import { models } from '@epfml/discojs';
import { AutoTokenizer, PreTrainedTokenizer } from '@xenova/transformers';
import fs from 'fs';

async function evaluateTFJS(tokenizer: PreTrainedTokenizer) {
    const model = new models.GPT({seed: 42,})
    log('Evaluating TFJS GPT on HellaSwag...');
    console.time('TFJS GPT Evaluation Time');

    const accuracy = await models.evaluate_hellaswag(model, tokenizer);

    console.timeEnd('TFJS GPT Evaluation Time');
    log(`TFJS GPT Accuracy: ${(accuracy * 100).toFixed(2)}%`);
}

async function evaluateXenova(tokenizer: PreTrainedTokenizer) {
    const model = await models.ONNXModel.init_pretrained('Xenova/gpt2');
    log('Evaluating Xenova GPT-2 (ONNX) on HellaSwag...');
    console.time('Xenova GPT-2 Evaluation Time');

    const accuracy = await models.evaluate_hellaswag(model, tokenizer);

    console.timeEnd('Xenova GPT-2 Evaluation Time');
    log(`Xenova GPT-2 Accuracy: ${(accuracy * 100).toFixed(2)}%`);
}

const logFile = 'evaluation_results.txt';
const logLines: string[] = [];

function log(message: string) {
    console.log(message);
    logLines.push(message);
}

async function main(): Promise<void> {
    const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2');
    await evaluateTFJS(tokenizer);
    console.log('\n---\n');
    await evaluateXenova(tokenizer);

    fs.writeFileSync(logFile, logLines.join('\n'), 'utf-8');
    log(`\nResults written to ${logFile}`);
}

main().catch(console.error);
