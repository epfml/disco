describe("TFJS Backend Selection", () => {
  it("initializes webgl by default", () => {
    cy.visit("/");
    cy.window().its("tf").invoke("getBackend").should("equal", "webgl");
  });

  it("initializes webgpu when requested via query parameter", () => {
    cy.visit("/?backend=webgpu");
    cy.window().its("tf").invoke("getBackend").should("equal", "webgpu");
  });
});
