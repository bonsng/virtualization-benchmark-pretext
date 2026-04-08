export interface MessageSeed {
  role: 'user' | 'assistant'
  markdown: string
}

export interface MessageData {
  id: number
  role: 'user' | 'assistant'
  markdown: string
  html: string // marked로 파싱된 HTML
}

export type MessageCount = 1000 | 5000 | 10000
export type Scenario = 'fixed' | 'infinite'
export type Mode = 'no-virtualization' | 'react-virtual' | 'pretext'

export interface BenchmarkResult {
  timestamp: number
  mountTime: number
  avgFps: number
  minFps: number
  frameDrops: number
  peakDomNodes: number
  memoryPeak: number | null
  resizeTime: number
  insertTime: number | null       // 무한 스크롤 전용
  scrollbarJumps: number | null   // 무한 스크롤 전용
}

export interface BenchmarkConfig {
  mode: Mode
  count: MessageCount
  scenario: Scenario
}

export function benchmarkKey(config: BenchmarkConfig): string {
  return `bench:${config.mode}:${config.count}:${config.scenario}`
}
