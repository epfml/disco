import {
  DecentralizedClient,
  defaultTasks,
  MeanAggregator,
  WeightsContainer,
} from "@epfml/discojs";

interface PeerResult {
  readonly id: string;
  readonly weights: number[];
}

describe("decentralized browser transport", () => {
  afterEach(() => cy.task("stopDecentralizedPeers"));

  it("exchanges weights with two Node peers through native WebRTC", () => {
    cy.task("startDecentralizedPeers");
    cy.then({ timeout: 270_000 }, async () => {
      const task = await defaultTasks.cifar10.getTask();
      const client = new DecentralizedClient(
        new URL("http://localhost:8081"),
        task,
        new MeanAggregator(0, 1, "relative"),
      );

      try {
        await client.connect();
        await client.onRoundBeginCommunication();
        const weights = await client.onRoundEndCommunication(
          WeightsContainer.of([3, 4]),
        );
        expect(Array.from(weights.weights[0].dataSync())).to.deep.equal([2, 3]);
      } finally {
        await client.disconnect();
      }
    });

    cy.task<PeerResult[]>("awaitDecentralizedPeers", null, {
      timeout: 270_000,
    }).then((results) => {
      expect(results).to.have.length(2);
      results.forEach(({ id, weights }) => {
        expect(id).to.be.a("string").and.have.length.greaterThan(0);
        expect(weights).to.deep.equal([2, 3]);
      });
    });
  });
});
