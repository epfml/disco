import { expect } from 'chai';
import { evaluate } from './hellaswag.js';
import { PreTrainedTokenizer } from '@xenova/transformers';
import { GPT } from './index.js';
import { ONNXModel } from './onnx.js';

describe('HellaSwag Evaluator', () => {
  it('evaluates tfjs GPT model', async () => {
    const tokenizer = await PreTrainedTokenizer.from_pretrained('Xenova/gpt2');
    const gpt = new GPT({seed: 42,}); // seed for reproducibility

    const accuracy = await evaluate(gpt, tokenizer, 2, true);
    expect(accuracy).to.be.gte(0);
    expect(accuracy).to.be.lte(1);
  }).timeout(20000);
});

describe('HellaSwag Evaluator with Xenova GPT-2', () => {
  it('evaluates the pretrained GPT-2 model', async () => {
    const tokenizer = await PreTrainedTokenizer.from_pretrained('Xenova/gpt2');
    const model = await ONNXModel.init_pretrained('Xenova/gpt2');
    // console.log(await model.getConfig());

    const accuracy = await evaluate(model, tokenizer, 2, true);
    expect(accuracy).to.be.gte(0);
    expect(accuracy).to.be.lte(1);
  }).timeout(60000);
});

describe('Deterministic evaluation with tfjs GPT-2', () => {
  it('returns the same accuracy across runs', async () => {
    const tokenizer = await PreTrainedTokenizer.from_pretrained('Xenova/gpt2');
    const gpt = new GPT({seed: 42,});

    const accuracy1 = await evaluate(gpt, tokenizer, 25);
    const accuracy2 = await evaluate(gpt, tokenizer, 25);

    expect(accuracy1).to.equal(accuracy2);
  }).timeout(60000);
});

describe('Deterministic evaluation with Xenova GPT-2', () => {
  it('returns the same accuracy across runs', async () => {
    const tokenizer = await PreTrainedTokenizer.from_pretrained('Xenova/gpt2');
    const model = await ONNXModel.init_pretrained('Xenova/gpt2');

    const accuracy1 = await evaluate(model, tokenizer, 25, false);
    const accuracy2 = await evaluate(model, tokenizer, 25, false);

    expect(accuracy1).to.equal(accuracy2);
  }).timeout(60000);
});
