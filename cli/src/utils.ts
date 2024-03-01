import fs from 'node:fs'

import type { TrainerLog } from '@epfml/discojs-core'

export function saveLog (logs: TrainerLog[], fileName: string): void {
  const filePath = `./${fileName}`
  fs.writeFileSync(filePath, JSON.stringify(logs, null, 2))
}
