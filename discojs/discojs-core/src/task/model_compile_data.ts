export function isModelCompileData (raw: unknown): raw is ModelCompileData {
  if (typeof raw !== 'object') {
    return false
  }
  if (raw === null) {
    return false
  }

  const {
    optimizer,
    loss,
    metrics
  } = raw as Record<'optimizer' | 'loss' | 'metrics', unknown | undefined>

  if (
    typeof optimizer !== 'string' ||
    (typeof loss !== 'string' && !Array.isArray(loss))
  ) {
    return false
  }

  if (!(
    Array.isArray(metrics) &&
    metrics.every((e) => typeof e === 'string')
  )) {
    return false
  }

  return true
}

export interface ModelCompileData {
  optimizer: string
  loss: string | any[]
  metrics: string[]
}
