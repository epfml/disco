import { Logger, TrainingStatus } from "./logger.js";

/**
 * DummyLogger not doing anything
 *
 * @class Logger
 */
export class DummyLogger implements Logger {
  success(_: string): void { }
  error(_: string): void { }
  setStatus(_: TrainingStatus): void { }
}
