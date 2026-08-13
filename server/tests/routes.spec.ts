import type * as http from "node:http";

import { afterEach, describe, expect, it } from "vitest";
import { z } from "zod";

import type {
  DataType,
  ModelCard,
  Network,
  TaskProvider,
} from "@epfml/discojs";
import {
  dataTypeValues,
  defaultModels,
  defaultTasks,
  fetchModels,
  fetchTasks,
  models,
  pushTask,
  serialization,
} from "@epfml/discojs";

import { Server } from "../src/index.js";

let handle: http.Server | undefined;

async function startServer(
  modelCards: ModelCard<DataType>[],
  taskProviders: TaskProvider<DataType, Network>[],
): Promise<URL> {
  const server = await Server.with(modelCards, taskProviders);

  const [started, url] = await server.serve();
  handle = started;
  return url;
}

afterEach(async () => {
  const started = handle;
  handle = undefined;
  if (started === undefined) return;

  // `close` waits for in-flight requests, some of which are never answered
  started.closeAllConnections();
  await new Promise<void>((resolve, reject) =>
    started.close((e) => {
      if (e !== undefined) reject(e);
      else resolve();
    }),
  );
});

const modelInfoSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  dataType: z.enum(dataTypeValues),
  contextLength: z.number().optional(),
});

/** POST a task to a running server, returning the raw response */
async function postTask(url: URL, body: unknown): Promise<Response> {
  return await fetch(new URL("tasks", url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /models", { timeout: 20_000 }, () => {
  it("lists the registered model cards", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier, defaultModels.Wikitext],
      [defaultTasks.titanic],
    );

    const res = await fetch(new URL("models", url));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);

    // strict objects: the encoded weights must not leak into the listing
    const infos = z.array(modelInfoSchema).parse(await res.json());
    // the set is an immutable Map, hence the unordered comparison
    expect(infos).toHaveLength(2);
    expect(infos).toEqual(
      expect.arrayContaining([
        defaultModels.TitanicClassifier.card, // without contextLength
        defaultModels.Wikitext.card, // with contextLength
      ]),
    );
  });

  it("lists models that no task references", async () => {
    // LUSClassifier is registered but only the titanic task is
    const url = await startServer(
      [defaultModels.TitanicClassifier, defaultModels.LUSClassifier],
      [defaultTasks.titanic],
    );

    const infos = z
      .array(modelInfoSchema)
      .parse(await (await fetch(new URL("models", url))).json());

    expect(infos.map((i) => i.id).sort()).toEqual(
      [
        defaultModels.TitanicClassifier.card.id,
        defaultModels.LUSClassifier.card.id,
      ].sort(),
    );
  });

  it("is empty on a server without models", async () => {
    const url = await startServer([], []);

    const res = await fetch(new URL("models", url));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("is readable by the discojs client", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier, defaultModels.Wikitext],
      [defaultTasks.titanic],
    );

    const infos = await fetchModels(url);

    expect(infos.get(defaultModels.TitanicClassifier.card.id)).toEqual(
      defaultModels.TitanicClassifier.card,
    );
    expect(infos.get(defaultModels.Wikitext.card.id)).toEqual(
      defaultModels.Wikitext.card,
    );
  });
});

describe("GET /tasks", { timeout: 20_000 }, () => {
  it("lists the registered tasks", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const res = await fetch(new URL("tasks", url));

    expect(res.status).toBe(200);
    const tasks = z
      .array(
        z.looseObject({ id: z.string(), dataType: z.enum(dataTypeValues) }),
      )
      .parse(await res.json());
    expect(tasks.map((t) => t.id)).toEqual([
      (await defaultTasks.titanic.getTask()).id,
    ]);
  });

  it("is readable by the discojs client", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const expected = await defaultTasks.titanic.getTask();
    const tasks = await fetchTasks(url);

    expect(tasks.keySeq().toArray()).toEqual([expected.id]);
    expect(tasks.get(expected.id)?.trainingInformation).toEqual(
      expected.trainingInformation,
    );
  });
});

describe("GET /tasks/schema", { timeout: 20_000 }, () => {
  it("serves a JSON Schema of the task definition", async () => {
    // the schema covers every data type whatever is registered, and a text
    // task's tokenizer is a `z.instanceof`, which JSON Schema cannot
    // represent: without `unrepresentable: "any"` the conversion throws and
    // the route answers 500
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const res = await fetch(new URL("tasks/schema", url));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^application\/json/);

    const schema = z
      .looseObject({ $schema: z.string(), allOf: z.array(z.unknown()) })
      .parse(await res.json());
    // Task.schema is an intersection of the base, data type and network schemas
    expect(schema.allOf.length).toBeGreaterThanOrEqual(2);
  });

  it("describes the task fields", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const schema = JSON.stringify(
      await (await fetch(new URL("tasks/schema", url))).json(),
    );

    // guards against the whole schema degrading to `{}`
    for (const field of [
      "displayInformation",
      "trainingInformation",
      "epochs",
      "aggregationStrategy",
    ])
      expect(schema).toContain(field);
  });
});

describe("GET /tasks/:id/model.json", { timeout: 20_000 }, () => {
  it("serves the encoded model of a registered task", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );
    const { id } = await defaultTasks.titanic.getTask();

    const res = await fetch(new URL(`tasks/${id}/model.json`, url));

    expect(res.status).toBe(200);
    const encoded = new Uint8Array(await res.arrayBuffer());
    expect(encoded.length).toBeGreaterThan(0);
    const model = await serialization.model.decode(encoded);
    expect(model).toBeInstanceOf(models.TFJS);
  });

  it("answers 404 for an unknown task", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const res = await fetch(new URL("tasks/not-a-task/model.json", url));

    expect(res.status).toBe(404);
  });

  it("answers 404 for an unknown file", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );
    const { id } = await defaultTasks.titanic.getTask();

    const res = await fetch(new URL(`tasks/${id}/not-a-model-file`, url), {
      signal: AbortSignal.timeout(2_000),
    });

    expect(res.status).toBe(404);
  });
});

describe("POST /tasks", { timeout: 20_000 }, () => {
  /** a task that isn't registered yet, reusing titanic's definition */
  async function newTask() {
    return {
      ...(await defaultTasks.titanic.getTask()),
      id: "titanic-copy",
    };
  }

  it("registers a task referencing an available model", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );
    const task = await newTask();

    const res = await postTask(url, {
      task: serialization.task.serializeToJSON(task),
      model: defaultModels.TitanicClassifier.card.id,
    });

    expect(res.status).toBe(200);
    const tasks = await fetchTasks(url);
    expect(tasks.keySeq().toArray()).toContain(task.id);
  });

  it("answers 409 when the task already exists", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const res = await postTask(url, {
      task: serialization.task.serializeToJSON(
        await defaultTasks.titanic.getTask(),
      ),
      model: defaultModels.TitanicClassifier.card.id,
    });

    expect(res.status).toBe(409);
  });

  it("registers a task with an uploaded model", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );
    const task = await newTask();
    const encoded = await serialization.model.encode(
      await defaultModels.TitanicClassifier.getModel(),
    );

    const res = await postTask(url, {
      task: serialization.task.serializeToJSON(task),
      model: [...encoded],
    });

    expect(res.status).toBe(200);
    expect((await fetchTasks(url)).keySeq().toArray()).toContain(task.id);

    // the upload is registered as a model of its own, named after the task
    const uploaded = (await fetchModels(url)).get(`${task.id}-model`);
    expect(uploaded).toEqual({
      id: `${task.id}-model`,
      name: task.displayInformation.title,
      dataType: "tabular",
    });

    const served = await fetch(new URL(`tasks/${task.id}/model.json`, url));
    expect(served.status).toBe(200);
  });

  it("answers 400 when the model is missing or undecodable", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );
    const task = serialization.task.serializeToJSON(await newTask());

    // no model at all
    expect((await postTask(url, { task })).status).toBe(400);
    // shaped like an upload, but not an encoded model
    expect((await postTask(url, { task, model: [1, 2, 3] })).status).toBe(400);
  });

  it("rejects an uploaded model whose data type doesn't match the task", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );
    // an image model, while the task is tabular. The mismatch is caught from
    // the model itself, nothing in the request states its data type
    const encoded = await serialization.model.encode(
      await defaultModels.LUSClassifier.getModel(),
    );

    const res = await postTask(url, {
      task: serialization.task.serializeToJSON(await newTask()),
      model: [...encoded],
    });

    expect(res.status).toBe(409);
    // the rejected upload is not left behind in the model set
    expect((await fetchModels(url)).keySeq().toArray()).toEqual([
      defaultModels.TitanicClassifier.card.id,
    ]);
  });

  it("rejects an unknown model ID", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const res = await postTask(url, {
      task: serialization.task.serializeToJSON(await newTask()),
      model: "not-a-model",
    });

    expect(res.status).toBe(409);
  });

  it("rejects a model whose data type doesn't match the task", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier, defaultModels.LUSClassifier],
      [defaultTasks.titanic],
    );

    const res = await postTask(url, {
      task: serialization.task.serializeToJSON(await newTask()), // tabular
      model: defaultModels.LUSClassifier.card.id, // image
    });

    expect(res.status).toBe(409);
  });

  it("answers 400 when the task is malformed", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );

    const res = await postTask(url, {
      task: { id: "malformed" },
      model: defaultModels.TitanicClassifier.card.id,
    });

    expect(res.status).toBe(400);
  });

  it("serves the model of a task added at runtime", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );
    const task = await newTask();

    const posted = await postTask(url, {
      task: serialization.task.serializeToJSON(task),
      model: defaultModels.TitanicClassifier.card.id,
    });
    expect(posted.status).toBe(200);

    const res = await fetch(new URL(`tasks/${task.id}/model.json`, url));
    expect(res.status).toBe(200);
  });

  it("accepts a model uploaded by the discojs client", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );
    const task = await newTask();

    await expect(
      pushTask(url, task, await defaultModels.TitanicClassifier.getModel()),
    ).resolves.toBeUndefined();

    expect((await fetchTasks(url)).keySeq().toArray()).toContain(task.id);
  });

  it("accepts a model ID from the discojs client", async () => {
    const url = await startServer(
      [defaultModels.TitanicClassifier],
      [defaultTasks.titanic],
    );
    const task = await newTask();

    await expect(
      pushTask(url, task, defaultModels.TitanicClassifier.card.id),
    ).resolves.toBeUndefined();

    expect((await fetchTasks(url)).keySeq().toArray()).toContain(task.id);
    // referencing an existing model adds no new one
    expect((await fetchModels(url)).keySeq().toArray()).toEqual([
      defaultModels.TitanicClassifier.card.id,
    ]);
  });
});
