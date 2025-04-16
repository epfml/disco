import { expect } from 'chai';
import { evaluate } from './hellaswag.js';
import { PreTrainedTokenizer } from '@xenova/transformers';
import { GPT } from '../index.js';
import { ONNXModel } from '../onnx.js';

describe('HellaSwag Evaluator', () => {
  it('evaluates our GPT model', async () => {
    const tokenizer = await PreTrainedTokenizer.from_pretrained('Xenova/gpt2');
    const gpt = new GPT({seed: 42,}); // seed for reproducibility

    const accuracy = await evaluate(gpt, tokenizer);  // evaluate the model on HellaSwag dataset
    expect(accuracy).to.be.gte(0);
    expect(accuracy).to.be.lte(1);
  }).timeout(20000);
});

describe('HellaSwag Evaluator with Xenova GPT-2', () => {
  it('evaluates the pretrained GPT-2 model', async () => {
    const tokenizer = await PreTrainedTokenizer.from_pretrained('Xenova/gpt2');
    const model = await ONNXModel.init_pretrained('Xenova/gpt2');

    const accuracy = await evaluate(model, tokenizer);
    expect(accuracy).to.be.gte(0);
    expect(accuracy).to.be.lte(1);
  }).timeout(30000);
});
