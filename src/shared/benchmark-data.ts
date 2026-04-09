import type { BenchmarkResult, Mode } from './types'

export interface DashboardEntry {
  mode: Mode
  label: string
  color: string
  result: BenchmarkResult
}

export const benchmarkData: DashboardEntry[] = [
  {
    mode: 'no-virtualization',
    label: 'No Virtualization',
    color: '#e07a5f',
    result: {
      timestamp: 1775720385293,
      rounds: 3,
      mountTime: 301.7,
      peakDomNodes: 36176,
      resizeTime: 75,
    },
  },
  {
    mode: 'react-virtual',
    label: 'React Virtual',
    color: '#3d85c6',
    result: {
      timestamp: 1775719842500,
      rounds: 3,
      mountTime: 59.9,
      peakDomNodes: 113,
      resizeTime: 16.5,
    },
  },
  {
    mode: 'pretext',
    label: 'Pretext',
    color: '#4a9c5e',
    result: {
      timestamp: 1775718979276,
      rounds: 3,
      mountTime: 16.4,
      peakDomNodes: 143,
      resizeTime: 16.6,
    },
  },
]
