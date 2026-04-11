export type NodeID = string

export function isNodeID (raw: unknown): raw is NodeID {
  return typeof raw === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(raw)
}
