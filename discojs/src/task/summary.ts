import { Set } from 'immutable'

export function isSummary (raw: unknown): raw is Summary {
  if (typeof raw !== 'object') {
    return false
  }

  if (raw === null) {
    return false
  }

  if (!Set(Object.keys(raw)).equals(Set.of('preview', 'overview'))) {
    return false
  }

  const { preview, overview } = raw as Record<'preview' | 'overview', unknown>

  if (!(typeof preview === 'string' && typeof overview === 'string')) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: Summary = { preview, overview }

  return true
}

export interface Summary {
  preview: string
  overview: string
}
