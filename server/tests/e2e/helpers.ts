import type * as http from "node:http";
import type {
  Client,
  DataFormat,
  DataType,
  Dataset,
  EpochLogs,
  ModelCard,
  Network,
  RoundLogs,
  RoundStatus,
  Task,
  TaskProvider,
} from "@epfml/discojs";
import {
  DecentralizedClient,
  Disco,
  MeanAggregator,
  SecureAggregator,
  WeightsContainer,
  defaultModels,
  defaultTasks,
} from "@epfml/discojs";
import * as tf from "@tensorflow/tfjs-node";
import { List } from "immutable";
import { afterEach, expect } from "vitest";

import { Server } from "../../src/index.js";
import { Queue, datasets } from "../utils.js";

let handle: http.Server | undefined;

afterEach(
  () =>
    new Promise<void>((resolve, reject) =>
      handle?.close((e) => {
        if (e !== undefined) reject(e);
        else resolve();
        handle = undefined;
      }),
    ),
);

export async function startServer<N extends Network>(
  model: ModelCard<DataType>,
  task: TaskProvider<DataType, N>,
): Promise<URL> {
  const server = await Server.with([model], [task]);

  let url: URL;
  [handle, url] = await server.serve();
  return url;
}

// Return tensor snapshot to check model weight reset
export const tensorMemorySnapshot = () => {
  const memory = tf.memory();

  return {
    numTensors: memory.numTensors,
    numBytes: memory.numBytes,
  };
};

export async function runFederatedUser<D extends DataType>(
  url: URL,
  task: Task<D, "federated">,
  dataset: Dataset<DataFormat.Raw[D]>,
  preprocessOnce = true,
): Promise<[WeightsContainer, EpochLogs]> {
  const disco = new Disco(task, url, { preprocessOnce });

  const logs = List(await arrayFromAsync(disco.trainByRound(dataset)));

  expect(logs.first()?.epochs.first()?.training.loss).to.be.above(
    logs.last()?.epochs.last()?.training.loss as number,
  );

  const lastEpoch = logs.last()?.epochs.last();
  if (lastEpoch === undefined) throw new Error("no epoch ran");

  const finalWeights = disco.trainer.model.weights.clone();
  await disco.close();

  return [finalWeights, lastEpoch];
}

/**
 * Makes client object to connect to server. The input array is the weights that the client will share
 * with other ready peers. The input will vary with model architecture and training data. If secure is true,
 * the client will implement secure aggregation. If it is false, it will be a clear text client.
 */
async function simulateClient(
  url: URL,
  aggregatorType: "mean" | "secure",
  input: number[],
  rounds: number,
): Promise<[WeightsContainer, Client<"decentralized">]> {
  const task = await defaultTasks.cifar10.getTask();
  const aggregator =
    aggregatorType === "mean"
      ? new MeanAggregator(0, 1, "relative")
      : new SecureAggregator();

  const client = new DecentralizedClient(url, task, aggregator);
  await client.connect();

  // Perform multiple training rounds
  let weights = WeightsContainer.of(input);
  for (let r = 0; r < rounds; r++) {
    await client.onRoundBeginCommunication();
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    weights = await client.onRoundEndCommunication(weights);
  }

  return [weights, client];
}

/**
 * Creates three clients with different update values and returns the aggregated update value between all three clients.
 * The clients have model dimension of 4 model updates to share, which can be seen as their input parameter in makeClient.
 */
export async function reachDecentralizedConsensus(
  url: URL,
  aggregatorType: "mean" | "secure",
  rounds = 1,
): Promise<void> {
  // Expect the clients to reach the mean consensus, for both the mean and secure aggregators
  const contributions = List.of(
    [0.001, 3, 40, 10],
    [0.002, 5, 30, 11],
    [0.003, 13, 11, 12],
  );
  const actual = await Promise.all(
    contributions
      .map(async (w) => await simulateClient(url, aggregatorType, w, rounds))
      .toArray(),
  );
  const consensuses = await Promise.all(
    actual.map(async ([consensus, client]) => {
      // Disconnect clients once they reached consensus
      await client.disconnect();
      return consensus;
    }),
  );

  const consensus = consensuses[0];
  await Promise.all(
    consensuses.map(
      async (current) => await expectWSToBeClose(consensus, current),
    ),
  );
}

/**
 * Runs 10 CIFAR-10 participants reaching consensus under decentralized training.
 */
export async function runTenCifar10Consensus(
  trainingInformationOverrides: Partial<
    Task<"image", "decentralized">["trainingInformation"]
  >,
): Promise<void> {
  const baseTask = await defaultTasks.cifar10.getTask();
  const task: Task<"image", "decentralized"> = {
    ...baseTask,
    trainingInformation: {
      ...baseTask.trainingInformation,
      scheme: "decentralized",
      epochs: 3,
      roundDuration: 1,
      minNbOfParticipants: 10,
      ...trainingInformationOverrides,
    } as Task<"image", "decentralized">["trainingInformation"],
  };

  const url = await startServer(defaultModels.CIFAR10Classifier, {
    ...defaultTasks.cifar10,
    getTask: () => Promise.resolve(task),
  });
  const dataset = await datasets.loadCifar10();

  const discos = Array.from(
    { length: 10 },
    () => new Disco(task, url, { preprocessOnce: true }),
  );

  try {
    const results = await Promise.all(
      discos.map(async (disco) => {
        const logs = List(await arrayFromAsync(disco.trainByRound(dataset)));
        const lastEpoch = logs.last()?.epochs.last();
        if (lastEpoch === undefined) throw new Error("no epoch ran");

        return [disco.trainer.model.weights, lastEpoch] as [
          WeightsContainer,
          EpochLogs,
        ];
      }),
    );

    await expectAllWSToBeClose(...results.map(([weights]) => weights));
  } finally {
    await Promise.all(discos.map((disco) => disco.close()));
  }
}

/** The LUS COVID task, decentralized between at least two participants */
export async function lusCovidDecentralized(
  trainingInformationOverrides: { epochs?: number } = {},
): Promise<{
  task: Task<"image", "decentralized">;
  taskProvider: TaskProvider<"image", "decentralized">;
}> {
  const baseTask = await defaultTasks.lusCovid.getTask();
  const task: Task<"image", "decentralized"> = {
    ...baseTask,
    trainingInformation: {
      ...baseTask.trainingInformation,
      scheme: "decentralized",
      aggregationStrategy: "mean",
      roundDuration: 1,
      minNbOfParticipants: 2,
      maxConnectionRetry: 3,
      maxPeerConnectionTime: 60_000,
      maxModelSyncTime: 30_000,
      ...trainingInformationOverrides,
    },
  };
  return {
    task,
    taskProvider: {
      ...defaultTasks.lusCovid,
      getTask: () => Promise.resolve(task),
    },
  };
}

// Array.fromAsync not yet widely used (2024)
export async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) {
    // TODO trick to allow other Promises to run
    // else one client might progress alone without communicating with others
    // will be fixed when client orchestrations in the server is correctly done
    await new Promise((resolve) => setTimeout(resolve, 10));

    ret.push(e);
  }
  return ret;
}

async function WSIntoList(ws: WeightsContainer): Promise<List<List<number>>> {
  return List(
    (await Promise.all(ws.weights.map(async (w) => await w.data()))).map(
      (arr) => List(arr),
    ),
  );
}

export async function expectWSToBeClose(
  left: WeightsContainer,
  right: WeightsContainer,
): Promise<void> {
  for (const tensors of (await WSIntoList(left)).zip(await WSIntoList(right)))
    for (const [l, r] of tensors[0].zip(tensors[1]))
      expect(l).to.be.closeTo(r, 1e-4);
}

/** Every given model should be close to the first one */
export async function expectAllWSToBeClose(
  ...weights: readonly WeightsContainer[]
): Promise<void> {
  const [reference, ...others] = weights;

  await Promise.all(
    others.map(async (current) => await expectWSToBeClose(reference, current)),
  );
}

/** The models a participant held at round boundaries */
export interface ModelRecording {
  /** Every recorded model, oldest first. Only the last one with `keep: "latest"`. */
  all: () => readonly WeightsContainer[];
  /** The most recently recorded model, throws if there is none yet. */
  latest: () => WeightsContainer;
  /** Release every recorded model */
  dispose: () => void;
}

/**
 * Records the model a peer holds at each round boundary: once
 * onRoundEndCommunication has returned and before the next local round trains
 * on it. Peers hold the very same model at those points, whereas
 * `trainer.model.weights` read afterwards also contains each peer's own local
 * training, which is not reproducible across peers.
 *
 * Pass `keep: "latest"` in the tests measuring tensor memory so that the
 * recorded models don't grow with the number of rounds.
 */
export function recordModelsAtRoundBoundary<
  D extends DataType,
  N extends Network,
>(
  disco: Disco<D, N>,
  { keep = "all" }: { keep?: "all" | "latest" } = {},
): ModelRecording {
  const models: WeightsContainer[] = [];

  disco.on("status", (status) => {
    if (status !== "local training") return;
    if (keep === "latest") models.splice(0).forEach((m) => m.dispose());
    models.push(
      new WeightsContainer(
        disco.trainer.model.weights.weights.map((w) => w.clone()),
      ),
    );
  });

  return {
    all: () => models,
    latest: () => {
      const model = models.at(-1);
      if (model === undefined)
        throw new Error("the peer hasn't reached a round boundary yet");
      return model;
    },
    dispose: () => models.splice(0).forEach((m) => m.dispose()),
  };
}

/** The peers should hold the same model at their latest round boundary */
export async function expectPeersToAgreeOnModel(
  ...recordings: readonly Pick<ModelRecording, "latest">[]
): Promise<void> {
  const [first, ...others] = recordings;
  for (const other of others)
    await expectWSToBeClose(first.latest(), other.latest());
}

/**
 * A client taking part in a task, with the events it emits recorded so that a
 * test can assert them in the order they were emitted.
 *
 * Rounds are driven in two steps because a single call to
 * `trainByRound().next()` performs a whole round and only resolves once the
 * other participants completed theirs: {@link startRound} kicks a round off and
 * {@link completeRound} awaits it. A test can therefore assert the events
 * emitted while a round is still in flight, which is how a participant waiting
 * for others is observed.
 */
export class Participant<D extends DataType, N extends Network> {
  readonly disco: Disco<D, N>;
  /** The models held at round boundaries, only the latest one is kept */
  readonly modelsAtRoundBoundary: ModelRecording;

  readonly #name: string;
  readonly #rounds: AsyncGenerator<RoundLogs>;
  readonly #statuses = new Queue<RoundStatus>();
  readonly #participants = new Queue<number>();
  readonly #syncedModel: Promise<WeightsContainer>;

  #pendingRound: Promise<IteratorResult<RoundLogs>> | undefined;
  #left = false;

  constructor(
    name: string,
    task: Task<D, N>,
    url: URL,
    dataset: Dataset<DataFormat.Raw[D]>,
  ) {
    this.#name = name;
    this.disco = new Disco(task, url, {
      preprocessOnce: true,
      debugLabel: name,
    });

    this.disco.on("status", (status) => this.#statuses.put(status));
    this.disco.on("participants", (participants) =>
      this.#participants.put(participants),
    );
    this.#syncedModel = new Promise((resolve) =>
      this.disco.on("modelSynced", (weights) => {
        // the event only lends the weights
        if (weights !== undefined) resolve(weights.clone());
      }),
    );

    this.modelsAtRoundBoundary = recordModelsAtRoundBoundary(this.disco, {
      keep: "latest",
    });
    this.#rounds = this.disco.trainByRound(dataset);
  }

  /** Start a round without waiting for it to complete */
  startRound(): this {
    if (this.#pendingRound !== undefined)
      throw new Error(`${this.#name} is already running a round`);

    const round = this.#rounds.next();
    // a round can stay pending forever, e.g. when the participant ends up
    // alone, and leaving the task then rejects it: never let that surface as
    // an unhandled rejection
    round.catch(() => undefined);
    this.#pendingRound = round;

    return this;
  }

  /** Wait for the current round, starting one if none is running */
  async completeRound(): Promise<RoundLogs> {
    if (this.#pendingRound === undefined) this.startRound();
    const pending = this.#pendingRound;
    if (pending === undefined) throw new Error("unreachable");

    const round = await pending;
    this.#pendingRound = undefined;

    if (round.done)
      throw new Error(`${this.#name} stopped training earlier than expected`);

    return round.value;
  }

  /** Assert the next emitted statuses, in order */
  async expectStatuses(...expected: readonly RoundStatus[]): Promise<void> {
    for (const status of expected)
      expect(await this.#statuses.next(), `${this.#name} status`).to.equal(
        status,
      );
  }

  /** Assert the next emitted participant counts, in order */
  async expectParticipants(...expected: readonly number[]): Promise<void> {
    for (const count of expected)
      expect(
        await this.#participants.next(),
        `${this.#name} participants`,
      ).to.equal(count);
  }

  /**
   * The model the participant synced with when joining mid-training,
   * only resolves for a participant which joined an ongoing session.
   */
  syncedModel(): Promise<WeightsContainer> {
    return this.#syncedModel;
  }

  /** Leave the task, releasing everything the participant holds */
  async leave(): Promise<void> {
    if (this.#left) return;
    this.#left = true;

    try {
      await this.disco.close();
    } finally {
      this.modelsAtRoundBoundary.dispose();
      void this.#syncedModel.then((weights) => weights.dispose());
    }
  }
}
