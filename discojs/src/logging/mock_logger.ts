import { Logger, TrainingStatus } from "./logger.js";

/**
 * MockLogger not doing anything
 *
 * @class Logger
 */
export class MockLogger implements Logger {
  success(_: string): void { }
  error(_: string): void { }
  setStatus(_: TrainingStatus): void { }
}
