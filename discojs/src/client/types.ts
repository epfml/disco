export type NodeID = string

// TODO @s314cy: regexp test just like server-side
export function isNodeID (raw: unknown): raw is NodeID {
  return typeof raw === 'string'
}
