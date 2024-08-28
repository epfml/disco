import { createPinia, setActivePinia } from "pinia";
import piniaPersited from "pinia-plugin-persistedstate";
import { beforeEach, expect, it } from "vitest";

import { models as discoModels } from "@epfml/discojs";

import { useModelsStore } from "../models";
import { createApp } from "vue";

const app = createApp({});
beforeEach(() => {
  const pinia = setActivePinia(createPinia().use(piniaPersited));
  app.use(pinia);
  setActivePinia(pinia);
});

it("persists", async () => {
  const models = useModelsStore();

  const id = await models.add("task id", new discoModels.GPT());

  models.$persist();
  models.$hydrate();

  expect(models.infos.size).to.equal(1);
  expect(await models.get(id)).to.be.an.instanceof(discoModels.GPT);
});
