// import fs from 'fs';
import fsPromise from 'node:fs/promises';

import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'ts-command-line-args'

import '@tensorflow/tfjs-node';
import fs from 'node:fs';
import path from 'node:path';
import { models, serialization, Tokenizer } from '@epfml/discojs';
import { loadHellaSwag } from '@epfml/discojs-node';
// import { AutoTokenizer } from '@xenova/transformers';

const __dirname = dirname(fileURLToPath(import.meta.url));

const logLines: string[] = [];
function log(message: string) {
    console.log(message);
    logLines.push(message);
}

async function evaluateModel(model: models.GPT | models.ONNXModel, numDataPoints = -1) {
    const hellaswagDataset: models.HellaSwagDataset = await loadHellaSwag(numDataPoints)
    const tokenizer = await Tokenizer.from_pretrained('Xenova/gpt2');
    log('Starting the HellaSwag benchmark...');

    const start = Date.now();
    const accuracy = await models.evaluate_hellaswag(model, tokenizer, hellaswagDataset, true);
    const duration = ((Date.now() - start) / 1000).toFixed(2);

    log(`Final accuracy: ${(accuracy * 100).toFixed(2)}%`);
    log(`Evaluation Time: ${duration} seconds`);
}

const ModelTypes = ['onnx', 'gpt-tfjs-random', 'gpt-tfjs-pretrained'] as const;
type ModelType = typeof ModelTypes[number];

interface HellaSwagArgs {
    model: ModelType
    numDataPoints: number
    logFile: string
    pretrainedModelPath: string
    help?: boolean
}

async function main(): Promise<void> {
    const defaultPretrainedModelPath = path.join(__dirname, "..", "..", "onnx-converter", "assets", "model.json")
    const args = parse<HellaSwagArgs>({
        model: {
            type: (raw: string) => raw as ModelType,
            description: `Model type, one of ${ModelTypes}`,
            defaultValue: 'onnx'
        },
        numDataPoints: {
            type: Number,
            description: 'Number of HellaSwag datapoints to evaluate, set -1 for the whole benchmark',
            defaultValue: -1
        },
        logFile: {
            type: String,
            description: 'Relative path to the log file, default to ./hellaswag.log', defaultValue: 'hellaswag.log'
        },
        pretrainedModelPath: {
            type: String,
            description: 'If specifying gpt-tfjs-pretrained, provide the relative path to the TF.js pretrained model',
            defaultValue: defaultPretrainedModelPath
        },
        help: {
            type: Boolean,
            optional: true,
            alias: 'h',
            description: 'Prints this usage guide'
        }
    }, { helpArg: 'help' })

    const logFile = path.join(__dirname, args.logFile);
    fs.writeFileSync(logFile, '', 'utf-8'); // Clear the log file

    let model: | models.GPT | models.ONNXModel | undefined;
    switch (args.model) {
        case 'onnx':
            log("Using ONNX pretrained model Xenova/gpt2")
            model = await models.ONNXModel.init_pretrained('Xenova/gpt2');
            break;
            case 'gpt-tfjs-random':
            log("Using GPT-TFJS with random initialization")
            model = new models.GPT({ seed: 42 });
            break;
            case 'gpt-tfjs-pretrained':
            log("Using GPT-TFJS with pretrained weights")
            if (args.pretrainedModelPath === undefined) {
                throw new Error("If choosing gpt-tfjs-pretrained, provide the relative path to the TF.js pretrained model `pretrainedModelPath")
            }
            const encodedModel = await fsPromise.readFile(args.pretrainedModelPath);
            model = await serialization.model.decode(encodedModel) as models.GPT;
            break;
        default:
            throw new Error(`Unrecognized model type: ${model}`);
    } 
    await evaluateModel(model, args.numDataPoints);

    fs.writeFileSync(logFile, logLines.join('\n'), 'utf-8');
    console.log(`\nResults written to ${logFile}`);
}

main().catch(console.error);
