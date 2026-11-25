import { expect, it, vi } from "vitest";
import { Dataset } from "#dataset/index";
import { LocalClient } from "#client/local_client";
import { abortable } from "#client/utils";
import { MeanAggregator } from "#aggregator/index";
import { titanic } from "#root/default_tasks/titanic";
import { Disco } from "#training/disco";
import { ClientDisconnectedError } from "#root/errors";
import { modelEncode } from "#serialization/index";
import type { Model } from "#models/index";
import type { DataType } from "#types/index";

class WaitingClient extends LocalClient {
  entered: () => void = () => undefined;
  override async onRoundBeginCommunication(): Promise<void> {
    this.entered();
    await abortable(new Promise<void>(() => {}), this.stopSignal);
  }
}

async function setup() {
  const task = await titanic.getTask();
  const { aggregationParams: _, ...trainingInformation } =
    task.trainingInformation;
  const localTask = {
    ...task,
    trainingInformation: {
      ...trainingInformation,
      scheme: "local" as const,
      aggregationStrategy: "mean" as const,
      validationSplit: 0,
    },
  };
  return {
    task: localTask,
    client: new WaitingClient(
      new URL("http://localhost"),
      localTask,
      new MeanAggregator(),
    ),
  };
}

it.each(["before startup", "during a network wait"])(
  "keeps a saveable model when Stop is requested %s",
  async (when) => {
    const { task, client } = await setup();
    const model = await titanic.modelCard.getModel();
    vi.spyOn(client, "getLatestModel").mockResolvedValue(model);
    const entered = new Promise<void>((resolve) => {
      client.entered = resolve;
    });
    const disco = new Disco(task, client, { scheme: "local" });
    const iterator = disco.train(
      new Dataset([
        {
          Age: "30",
          SibSp: "0",
          Parch: "0",
          Fare: "10",
          Pclass: "1",
          Sex: "female",
          Embarked: "S",
          Survived: "1",
        },
      ]),
    );
    let recovered: Model<DataType> | undefined;
    try {
      if (when === "before startup") disco.requestStop();
      const next = iterator.next();
      const stopped = expect(next).rejects.toBeInstanceOf(
        ClientDisconnectedError,
      );
      if (when === "during a network wait") {
        await entered;
        disco.requestStop();
      }
      await stopped;
      recovered = disco.trainer.releaseModel();
      expect(recovered).toBe(model);
      expect((await modelEncode(model)).byteLength).toBeGreaterThan(0);
    } finally {
      recovered?.dispose();
      await disco.close();
    }
  },
);
