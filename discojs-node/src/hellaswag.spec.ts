import { expect } from 'chai';
import { load as loadHellaSwag } from './hellaswag.js';
import fs from 'fs';

describe('HellaSwag parser', () => {
  it('should load all examples and return them as an array', async () => {
    const filename: string = "../datasets/hellaswag_val.jsonl"
    expect(fs.existsSync(filename)).to.be.true;

    const dataset = await loadHellaSwag(filename);

    expect(dataset).to.be.an('array');
    expect(dataset.length).to.be.greaterThan(0);

    // Check the structure of the first example
    const example = dataset[0];
    expect(example).to.have.property('ctx').that.is.a('string');
    expect(example).to.have.property('endings').that.is.an('array').with.lengthOf(4);
    expect(example).to.have.property('label').that.is.a('number');
  });
});

