export type JSONLike =
  | null
  | undefined
  | boolean
  | number
  | string
  | JSONLike[]
  | { [_: string]: JSONLike };
