import { Set } from 'immutable'

export function isDataExample (raw: unknown): raw is DataExample {
  if (typeof raw !== 'object') {
    return false
  }
  if (raw === null) {
    return false
  }

  if (!Set(Object.keys(raw)).equals(Set.of('columnName', 'columnData'))) {
    return false
  }
  const { columnName, columnData } = raw as Record<'columnName' | 'columnData', unknown>

  if (
    typeof columnName !== 'string' ||
      (typeof columnData !== 'string' && typeof columnData !== 'number')
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: DataExample = { columnName, columnData }

  return true
}

export interface DataExample {
  columnName: string
  columnData: string | number
}
