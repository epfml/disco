import { describe, it, expect } from "vitest";
import { load as loadHellaSwag } from './hellaswag.js';
import { models } from '@epfml/discojs';

describe('hellaswag parser', () => {
  it('loads the whole hellaswag dataset', async () => {
    // small dataset as a string, in HellaSwag format
    const exampleLines = [
      JSON.stringify({
        ctx: "Test context sentence.",
        endings: ["Ending 1.", "Ending 2.", "Ending 3.", "Ending 4."],
        label: 2
      }),
      JSON.stringify({
        ctx: "Another context.",
        endings: ["Option 1.", "Option 2.", "Option 3.", "Option 4."],
        label: 1
      })
    ].join('\n');

    // jsdom doesn't implement .text on File/Blob
    // trick from https://github.com/jsdom/jsdom/issues/2555
    const blob = await (await fetch("data:," + encodeURIComponent(exampleLines))).blob();

    const dataset: models.HellaSwagDataset = await loadHellaSwag(blob);

    // basic assertions
    expect(dataset).to.be.an('array');
    expect(dataset.length).to.equal(2);

    // check structure of the first example
    const first = dataset[0];
    expect(first).to.have.property('ctx').that.is.a('string');
    expect(first).to.have.property('endings').that.is.an('array').with.lengthOf(4);
    expect(first).to.have.property('label').that.is.a('number');
  });
});
