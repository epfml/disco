// Check the JSON boundary without importing the app project into Cypress's
// separate TypeScript project.
interface Report {
  repetitions: number;
  rows: {
    mode: string;
    elapsedMs: number;
    logicalBytes: number;
    latenciesMs: number[];
    iterations: number;
    peers: number;
  }[];
}

it("measures the production worker peer bridge", () => {
  cy.task("benchmarkEnvironment").as("benchmarkEnvironment");
  cy.visit("/benchmarks/peer-transport.html");
  cy.window().should("have.property", "runPeerTransportBenchmark");
  cy.window()
    .then({ timeout: 20 * 60_000 }, async (window): Promise<Report> => {
      return await (
        window as unknown as {
          runPeerTransportBenchmark: () => Promise<Report>;
        }
      ).runPeerTransportBenchmark();
    })
    .then((report) => {
      return cy.get("@benchmarkEnvironment").then((environment) => {
        return cy
          .writeFile("benchmarks/results/latest.json", {
            ...report,
            environment,
          })
          .then(() => report);
      });
    })
    .then((report) => {
      expect(report.rows.length).to.be.greaterThan(0);
      for (const row of report.rows) {
        expect(row.elapsedMs).to.be.at.least(0);
        if (row.mode !== "direct") expect(row.elapsedMs).to.be.greaterThan(0);
        expect(row.logicalBytes).to.be.greaterThan(0);
        expect(row.latenciesMs).to.have.length(row.iterations * row.peers);
      }
    });
});
