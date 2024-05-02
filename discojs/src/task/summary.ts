export interface Summary {
  preview: string
  overview: string
}

export function isSummary (raw: unknown): raw is Summary {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const { preview, overview }: Partial<Record<keyof Summary, unknown>> = raw

  if (!(typeof preview === 'string' && typeof overview === 'string')) {
    return false
  }

  const repack = { preview, overview }
  const _correct: Summary = repack
  const _total: Record<keyof Summary, unknown> = repack

  return true
}
