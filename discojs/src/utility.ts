import { Weights } from '.'

// See: https://en.wikipedia.org/wiki/Matrix_norm
export function frobeniusNorm (model: Weights): number {
  return Math.sqrt(model.map((w) => w.square().sum().dataSync()[0]).reduce((a: number, b) => a + b))
}

export function computeQuantile (array: number[], q: number): number {
  const sorted = array.sort((a, b) => a - b)
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const rest = pos - base
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base])
  } else {
    return sorted[base]
  }
}
