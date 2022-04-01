export class DataExample {
  constructor(
    public readonly columnName: string,
    public readonly columnData: string | number
  ) {}
}

export class DisplayInformation {
  constructor(
    public readonly taskTitle: string,
    public readonly summary: string,
    public readonly overview: string,
    public readonly tradeoffs: string,
    public readonly dataFormatInformation: string,
    public readonly dataExampleText: string,
    public readonly model?: string,
    public readonly dataExample?: DataExample[],
    public readonly headers?: string[],
    public readonly dataExampleImage?: string,
    public readonly limitations?: string
  ) {}
}

export type TaskID = string;

export class Task {
  constructor(
    public readonly taskID: TaskID,
    public readonly displayInformation?: DisplayInformation
  ) {}
}
