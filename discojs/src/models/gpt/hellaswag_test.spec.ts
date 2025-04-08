import { expect } from 'chai';
import { evaluate } from './hellaswag.js';
import { PreTrainedTokenizer } from '@xenova/transformers';
import { GPT } from '../index.js';

describe('HellaSwag Evaluator', () => {
  it('evaluates GPT model and returns accuracy between 0 and 1', async () => {
    const tokenizer = await PreTrainedTokenizer.from_pretrained('Xenova/gpt2');
    const gpt = new GPT({seed: 42,}); // seed for reproducibility

    const accuracy = await evaluate(gpt, tokenizer);  // evaluate the model on HellaSwag dataset
    expect(accuracy).to.be.gte(0);
    expect(accuracy).to.be.lte(1);
  }).timeout(20000);
});
