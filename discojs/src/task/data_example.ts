export interface DataExample {
  columnName: string
  columnData: string | number
}

export function isDataExample (raw: unknown): raw is DataExample {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const { columnName, columnData }: Partial<Record<keyof DataExample, unknown>> = raw

  if (
    typeof columnName !== 'string' ||
      (typeof columnData !== 'string' && typeof columnData !== 'number')
  ) {
    return false
  }

  const repack = { columnName, columnData }
  const _correct: DataExample = repack
  const _total: Record<keyof DataExample, unknown> = repack

  return true
}
