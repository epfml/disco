import { defaultTasks } from "@epfml/discojs";

import { setupServerWith } from "../support/e2e";

/**
 * Download the wikitext GPT model and open the chat page with it.
 *
 * Going through the model library rather than visiting /chat directly matters:
 * without a `modelID`, the page falls back to downloading GPT2 from HuggingFace.
 */
function openChatWithDownloadedModel(): void {
  setupServerWith(defaultTasks.wikitext);

  cy.visit("/evaluate");
  cy.contains("button", "download").click();
  cy.contains("button", "chat").click();

  cy.url().should("contain", "/chat?modelID=");
  cy.contains("Model loaded!", { timeout: 30_000 });
}

type Options = Partial<Cypress.Timeoutable>;

const PLACEHOLDER = "Generation will appear here...";

const generateButton = (options?: Options) =>
  cy.get('button[title="Generate"]', options);
const stopButton = () => cy.get('button[title="Stop"]');
const clearButton = () => cy.get('button[title="Clear Generation"]');
const promptInput = () => cy.get('input[type="text"]');
const generation = (options?: Options) =>
  cy.get('[aria-live="polite"]', options);
/** The spans highlighting what the model generated. */
const highlights = () => generation().find('span[class*="bg-disco-cyan"]');
const sampling = () => cy.get('input[type="checkbox"]');

/** The range input of a parameter, found from its label. */
const slider = (label: string) =>
  cy.contains("label", label).parent().find('input[type="range"]');

/** The value displayed next to a parameter's slider. */
const sliderValue = (label: string) =>
  cy.contains("label", label).parent().find("span");

function setSlider(label: string, value: number): void {
  slider(label).invoke("val", value).trigger("input");
}

describe("chat UI", () => {
  // the parameters sidebar is collapsed below Tailwind's `lg` breakpoint
  beforeEach(() => cy.viewport(1280, 800));

  it("opens the chat page from a text model of the library", () => {
    setupServerWith(defaultTasks.wikitext);

    cy.visit("/evaluate");
    cy.contains("button", "download").click();

    // text models are chatted with, not tested nor predicted
    cy.contains("Data type").siblings().should("have.text", "Text");
    cy.contains("button", "chat").click();

    cy.url().should("contain", "/chat?modelID=");
    cy.contains("LLM Playground");
    // the downloaded model is used, rather than the remote ONNX one
    cy.get("select").should("have.value", "tfjs-gpt2");
  });

  it("displays the default generation parameters", () => {
    openChatWithDownloadedModel();

    generation().should("have.text", PLACEHOLDER);
    promptInput().should("have.value", "").and("be.enabled");

    sampling().should("be.checked");
    sliderValue("Temperature").should("have.text", "1");
    sliderValue("Top-k").should("have.text", "50");
    sliderValue("Max Tokens").should("have.text", "50");
  });

  it("only enables generation once a prompt is entered", () => {
    openChatWithDownloadedModel();

    generateButton().should("be.disabled");

    promptInput().type("   ");
    generateButton().should("be.disabled");

    promptInput().type("DISCO is");
    generateButton().should("be.enabled");
  });

  it("ties sampling to the temperature", () => {
    openChatWithDownloadedModel();

    // without sampling, the temperature is zero and the samplers are locked
    sampling().uncheck();
    sliderValue("Temperature").should("have.text", "0");
    slider("Temperature").should("be.disabled");
    slider("Top-k").should("be.disabled");

    sampling().check();
    sliderValue("Temperature").should("have.text", "1");
    slider("Temperature").should("be.enabled");
    slider("Top-k").should("be.enabled");

    // and zeroing the temperature turns sampling back off
    setSlider("Temperature", 0);
    sampling().should("not.be.checked");
  });

  it("resets parameters to their defaults", () => {
    openChatWithDownloadedModel();

    setSlider("Temperature", 1.5);
    setSlider("Top-k", 10);
    setSlider("Max Tokens", 200);
    sliderValue("Temperature").should("have.text", "1.5");

    cy.contains("button", "Reset").click();

    sampling().should("be.checked");
    sliderValue("Temperature").should("have.text", "1");
    sliderValue("Top-k").should("have.text", "50");
    sliderValue("Max Tokens").should("have.text", "50");
  });

  it("generates, highlights and clears text", () => {
    openChatWithDownloadedModel();

    setSlider("Max Tokens", 2);
    promptInput().type("DISCO is{enter}");

    // the prompt moves to the generation area and the input is emptied
    generation().should("contain.text", "DISCO is");
    promptInput().should("have.value", "");

    // generation is over once the button is idle again
    generateButton({ timeout: 60_000 }).should("be.disabled");
    // only the generated tokens are highlighted
    highlights()
      .should("have.length", 1)
      .invoke("text")
      .should("not.be.empty")
      .and("not.contain", "DISCO is");

    clearButton().click();
    generation().should("have.text", PLACEHOLDER);
    highlights().should("not.exist");
  });

  it("stops an ongoing generation", () => {
    openChatWithDownloadedModel();

    setSlider("Max Tokens", 200);
    promptInput().type("DISCO is");
    generateButton().click();

    // whatever acts on the generation is disabled while it runs
    clearButton().should("be.disabled");
    cy.contains("button", "Regenerate").should("be.disabled");
    promptInput().should("be.disabled");

    stopButton().click();

    generateButton({ timeout: 60_000 }).should("exist");
    clearButton().should("be.enabled");
    promptInput().should("be.enabled");
  });

  it("regenerates from the last prompt", () => {
    openChatWithDownloadedModel();

    setSlider("Max Tokens", 2);
    promptInput().type("DISCO is{enter}");
    generateButton({ timeout: 60_000 }).should("be.disabled");

    cy.contains("button", "Regenerate").click();

    // the prompt is kept and generated from again, rather than a second
    // generation being appended to the first one
    generation({ timeout: 60_000 })
      .invoke("text")
      .should((text) => {
        expect(text).to.match(/^DISCO is/);
        expect(text.match(/DISCO is/g)).to.have.lengthOf(1);
        expect(text.length).to.be.greaterThan("DISCO is".length);
      });
    highlights().should("have.length", 1);
  });

  it("generates with the ONNX model", () => {
    // transformers.js looks for a self-hosted copy under `/models/` before
    // falling back to the HuggingFace hub, and only falls back on a 404 --
    // which the dev server never returns, answering its SPA fallback instead.
    cy.intercept("/models/**", { statusCode: 404 });

    // without a `modelID`, the page loads the pretrained ONNX GPT2:
    // ~130 MB downloaded from HuggingFace, then cached by the browser
    cy.visit("/chat");
    cy.get("select").should("have.value", "onnx-gpt2");
    cy.contains("Model loaded!", { timeout: 300_000 });

    setSlider("Max Tokens", 2);
    promptInput().type("DISCO is{enter}");

    generation().should("contain.text", "DISCO is");
    generateButton({ timeout: 120_000 }).should("be.disabled");
    highlights()
      .should("have.length", 1)
      .invoke("text")
      .should("not.be.empty")
      .and("not.contain", "DISCO is");
  });

  it("warns when the model can't be loaded", () => {
    // e.g. a bookmarked link to a model that has since been removed
    cy.visit("/chat?modelID=404");

    cy.contains("An error occurred");
  });

  it("collapses the parameters on small screens", () => {
    cy.viewport("iphone-x");
    openChatWithDownloadedModel();

    slider("Max Tokens").should("not.be.visible");

    cy.contains("button", "Model Parameters").click();
    slider("Max Tokens").should("be.visible");

    cy.contains("button", "Model Parameters").click();
    slider("Max Tokens").should("not.be.visible");
  });
});
