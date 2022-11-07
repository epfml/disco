export interface Digest {
  algorithm: string
  value: string
}

export function isDigest (raw: unknown): raw is Digest {
  if (typeof raw !== 'object') {
    return false
  }
  if (raw === null) {
    return false
  }

  const { algorithm, value } = raw as Record<string, unknown | undefined>

  if (!(
    typeof algorithm === 'string' &&
    typeof value === 'string'
  )) {
    return false
  }

  return true
}
