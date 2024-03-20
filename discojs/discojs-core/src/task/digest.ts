export interface Digest {
  algorithm: string
  value: string
}

export function isDigest (raw: unknown): raw is Digest {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const { algorithm, value }: Partial<Record<string, unknown>> = raw

  if (!(
    typeof algorithm === 'string' &&
    typeof value === 'string'
  )) {
    return false
  }

  const repack = { algorithm, value }
  const _correct: Digest = repack
  const _total: Record<keyof Digest, unknown> = repack

  return true
}
