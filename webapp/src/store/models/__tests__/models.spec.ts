import { createPinia, setActivePinia } from "pinia";
import { createPersistedStatePlugin } from "pinia-plugin-persistedstate-2";
import { beforeEach, expect, it } from "vitest";
import { createApp } from "vue";

import { models as discoModels } from "@epfml/discojs";

import { useModelsStore } from "../index";

const app = createApp({});
beforeEach(() => {
  const pinia = setActivePinia(createPinia().use(createPersistedStatePlugin()));
  app.use(pinia);
  setActivePinia(pinia);
});

it("stores model", async () => {
  const models = useModelsStore();

  const id = await models.add("task id", new discoModels.GPT());
  expect(models.infos.size).to.equal(1);
  expect(await models.get(id)).to.be.an.instanceof(discoModels.GPT);
});
