export type PeerID = number

export function isPeerID (raw: unknown): raw is PeerID {
  return typeof raw === 'number'
}
