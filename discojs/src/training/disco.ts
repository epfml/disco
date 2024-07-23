import { List } from 'immutable'

import { async_iterator, BatchLogs, data, EpochLogs, Logger, Memory, Task, TrainingInformation } from '../index.js'
import { client as clients, EmptyMemory, ConsoleLogger } from '../index.js'
import {getAggregator, type Aggregator } from '../aggregator/index.js'
import { enumerate, split } from '../utils/async_iterator.js'

import type { RoundLogs, Trainer } from './trainer/trainer.js'
import { TrainerBuilder } from './trainer/trainer_builder.js'

export interface DiscoOptions {
  client?: clients.Client
  aggregator?: Aggregator
  url?: string | URL
  scheme?: TrainingInformation['scheme']
  logger?: Logger
  memory?: Memory
}

/**
 * Top-level class handling distributed training from a client's perspective. It is meant to be
 * a convenient object providing a reduced yet complete API that wraps model training,
 * communication with nodes, logs and model memory.
 */
export class Disco {
  public readonly task: Task
  public readonly logger: Logger
  public readonly memory: Memory
  private readonly client: clients.Client
  private readonly trainerPromise: Promise<Trainer>

  constructor (
    task: Task,
    options: DiscoOptions
  ) {
    // Fill undefined options with default values
    if (options.scheme === undefined) {
      options.scheme = task.trainingInformation.scheme
    }
    if (options.client === undefined) {
      if (options.url === undefined) {
        throw new Error('could not determine client from given parameters')
      }
      if (options.aggregator === undefined) {
        options.aggregator = getAggregator(task, { scheme: options.scheme })
      }

      if (typeof options.url === 'string') {
        options.url = new URL(options.url)
      }
      options.client = clients.getClient(options.scheme, options.url, task, options.aggregator)
    }
    if (options.logger === undefined) {
      options.logger = new ConsoleLogger()
    }
    if (options.memory === undefined) {
      options.memory = new EmptyMemory()
    }
    if (options.client.task !== task) {
      throw new Error('client not setup for given task')
    }

    this.task = task
    this.client = options.client
    this.memory = options.memory
    this.logger = options.logger

    const trainerBuilder = new TrainerBuilder(this.memory, this.task)
    this.trainerPromise = trainerBuilder.build(this.client, options.scheme !== 'local')
  }

  /** Train on dataset, yielding logs of every round. */
  async *trainByRound(
    dataTuple: data.DataSplit,
  ): AsyncGenerator<RoundLogs & { participants: number }> {
    for await (const round of this.train(dataTuple)) {
      const [roundGen, roundLogs] = async_iterator.split(round);
      for await (const epoch of roundGen) for await (const _ of epoch);
      yield await roundLogs;
    }
  }

  /** Train on dataset, yielding logs of every epoch. */
  async *trainByEpoch(dataTuple: data.DataSplit): AsyncGenerator<EpochLogs> {
    for await (const round of this.train(dataTuple)) {
      for await (const epoch of round) {
        const [epochGen, epochLogs] = async_iterator.split(epoch);
        for await (const _ of epochGen);
        yield await epochLogs;
      }
    }
  }

  /** Train on dataset, yielding logs of every batch. */
  async *trainByBatch(dataTuple: data.DataSplit): AsyncGenerator<BatchLogs> {
    for await (const round of this.train(dataTuple))
      for await (const epoch of round)
        yield* epoch;
  }

  /** Run whole train on dataset. */
  async trainFully(dataTuple: data.DataSplit): Promise<void> {
    for await (const round of this.train(dataTuple))
      for await (const epoch of round)
        for await (const _ of epoch);
  }

  /**
  * Train on dataset, yield the nested steps.
  *
  * Don't forget to await the yielded generator otherwise nothing will progress.
  * If you don't care about the whole process, use one of the other train methods.
  **/
  // TODO RoundLogs should contain number of participants but Trainer doesn't need client
  async *train(
    dataTuple: data.DataSplit,
  ): AsyncGenerator<
    AsyncGenerator<
      AsyncGenerator<BatchLogs, EpochLogs>,
      RoundLogs & { participants: number }
    >
  > {
    this.logger.success("Training started.");

    const trainData = dataTuple.train.preprocess().batch();
    const validationData =
      dataTuple.validation?.preprocess().batch() ?? trainData;
    await this.client.connect();
    const trainer = await this.trainerPromise;

    for await (const [round, epochs] of enumerate(
      trainer.fitModel(trainData.dataset, validationData.dataset),
    )) {
      yield async function* (this: Disco) {
        let epochsLogs = List<EpochLogs>();
        for await (const [epoch, batches] of enumerate(epochs)) {
          const [gen, returnedEpochLogs] = split(batches);

          yield gen;
          const epochLogs = await returnedEpochLogs;
          epochsLogs = epochsLogs.push(epochLogs);

          this.logger.success(
            [
              `Round: ${round}`,
              `  Epoch: ${epoch}`,
              `    Training loss: ${epochLogs.training.loss}`,
              `    Training accuracy: ${epochLogs.training.accuracy}`,
              epochLogs.validation !== undefined
                ? `    Validation loss: ${epochLogs.validation.loss}`
                : "",
              epochLogs.validation !== undefined
                ? `    Validation accuracy: ${epochLogs.validation.accuracy}`
                : "",
            ].join("\n"),
          );
        }

        return {
          epochs: epochsLogs,
          participants: this.client.nbOfParticipants, // already includes ourselves
        };
      }.bind(this)();
    }

    this.logger.success("Training finished.");
  }

  /**
   * Stops the ongoing training instance without disconnecting the client.
   */
  async pause (): Promise<void> {
    const trainer = await this.trainerPromise
    await trainer.stopTraining()
  }

  /**
   * Completely stops the ongoing training instance.
   */
  async close(): Promise<void> {
    await this.pause();
    await this.client.disconnect();
  }
}
