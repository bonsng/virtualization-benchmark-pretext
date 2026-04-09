export interface MessageSeed {
  role: 'user' | 'assistant'
  markdown: string
}

export interface MessageData {
  id: number
  role: 'user' | 'assistant'
  markdown: string
  html: string
}

export type MessageCount = 1000 | 5000 | 10000
export type Scenario = 'fixed' | 'infinite'
export type Mode = 'no-virtualization' | 'react-virtual' | 'pretext'

export interface RoundResult {
  mountTime: number
  peakDomNodes: number
  resizeTime: number
}

export interface BenchmarkResult {
  timestamp: number
  rounds: number
  mountTime: number       // 중앙값 ms
  peakDomNodes: number    // 중앙값
  resizeTime: number      // 중앙값 ms
}

export interface BenchmarkConfig {
  mode: Mode
  count: MessageCount
  scenario: Scenario
}

export function benchmarkKey(config: BenchmarkConfig): string {
  return `bench:${config.mode}:${config.count}:${config.scenario}`
}
