import { BenchmarkLog } from './benchmark'
import fs from 'fs'
import path from 'path'

export interface SaveConfig {
  path: string,
  fileName: string
}

interface BenchmarkDict {
  [key: string]: string
}

function logToDict (benchmarkLog: BenchmarkLog): BenchmarkDict {
  const benchmarkDict = {}
  benchmarkLog.forEach((value, key) => (benchmarkDict[key] = value))
  return benchmarkDict
}

export function save (BenchmarkLog: BenchmarkLog, config: SaveConfig) {
  // If folder does not exist, make it
  if (!fs.existsSync(config.path)) {
    fs.mkdirSync(config.path, { recursive: true })
  }

  // Map data to dict (easier to parse to json)
  const benchmarkDict = logToDict(BenchmarkLog)

  // stringify
  const data = JSON.stringify(benchmarkDict)

  // Save to file
  const filePath = path.join(config.path, config.fileName)
  fs.writeFileSync(filePath, data)
}
