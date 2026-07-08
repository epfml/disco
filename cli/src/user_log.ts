import { args, BenchmarkArguments } from "./args.js";
import type { SummaryLogs, DataType, Network, Task } from "@epfml/discojs";

type SerializableArguments = Omit<BenchmarkArguments, "provider" | "host"> & {
  host: string;
};

export interface UserLogFile {
  run: {
    testID: string;
    taskID: string;
    numberOfUsers: number;
  };
  task: {
    id: string;
    dataType: string;
    trainingInformation: unknown;
  };
  args: SerializableArguments;
  user: {
    index: number;
    clientId: string;
  };
  logs: SummaryLogs[];
}

function serializeArgs(): SerializableArguments {
  const { provider, host, ...rest } = args;
  return {
    ...rest,
    host: host.toString(),
  };
}

export function makeUserLogFile<D extends DataType, N extends Network>(
  task: Task<D, N>,
  numberOfUsers: number,
  userIndex: number,
  clientId: string,
  logs: SummaryLogs[],
): UserLogFile {
  return {
    run: {
      testID: args.testID,
      taskID: task.id,
      numberOfUsers,
    },
    task: {
      id: task.id,
      dataType: task.dataType,
      trainingInformation: task.trainingInformation,
    },
    args: serializeArgs(),
    user: {
      index: userIndex,
      clientId: clientId,
    },
    logs: logs,
  };
}
