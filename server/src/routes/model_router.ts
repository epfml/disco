import express from "express";

import type { ModelSet } from "../model_set.js";

export class ModelRouter {
  readonly #expressRouter: express.Router;
  readonly #modelSet: ModelSet;

  constructor(modelSet: ModelSet) {
    this.#modelSet = modelSet;
    this.#expressRouter = express.Router();

    // Return available models upon GET requests
    this.#expressRouter.get("/", (_, res) => {
      res.status(200).send(
        this.#modelSet.models
          .valueSeq()
          .map(([modelInfo, _]) => modelInfo)
          .toArray(),
      );
    });

    this.#expressRouter.use(express.json());
  }

  public get router(): express.Router {
    return this.#expressRouter;
  }
}
