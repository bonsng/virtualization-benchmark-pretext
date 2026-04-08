import type { BenchmarkResult } from './types'

export class MetricsCollector {
  private frameTimestamps: number[] = []
  private mountTimeMs = 0
  private peakDom = 0
  private memoryPeakBytes: number | null = null
  private resizeTimeMs = 0
  private insertTimeMs: number | null = null
  private scrollbarJumpCount: number | null = null

  recordFrame(timestamp: number): void {
    this.frameTimestamps.push(timestamp)
  }

  setMountTime(ms: number): void {
    this.mountTimeMs = ms
  }

  recordDomNodes(count: number): void {
    if (count > this.peakDom) this.peakDom = count
  }

  recordMemory(bytes: number): void {
    if (this.memoryPeakBytes === null || bytes > this.memoryPeakBytes) {
      this.memoryPeakBytes = bytes
    }
  }

  setResizeTime(ms: number): void {
    this.resizeTimeMs = ms
  }

  setInsertTime(ms: number): void {
    this.insertTimeMs = ms
  }

  setScrollbarJumps(count: number): void {
    this.scrollbarJumpCount = count
  }

  getResults(): BenchmarkResult {
    const deltas = this.computeDeltas()
    return {
      timestamp: Date.now(),
      mountTime: this.mountTimeMs,
      avgFps: this.computeAvgFps(deltas),
      minFps: this.computeMinFps(deltas),
      frameDrops: this.countFrameDrops(deltas),
      peakDomNodes: this.peakDom,
      memoryPeak: this.memoryPeakBytes,
      resizeTime: this.resizeTimeMs,
      insertTime: this.insertTimeMs,
      scrollbarJumps: this.scrollbarJumpCount,
    }
  }

  reset(): void {
    this.frameTimestamps = []
    this.mountTimeMs = 0
    this.peakDom = 0
    this.memoryPeakBytes = null
    this.resizeTimeMs = 0
    this.insertTimeMs = null
    this.scrollbarJumpCount = null
  }

  private computeDeltas(): number[] {
    const deltas: number[] = []
    for (let i = 1; i < this.frameTimestamps.length; i++) {
      deltas.push(this.frameTimestamps[i] - this.frameTimestamps[i - 1])
    }
    return deltas
  }

  private computeAvgFps(deltas: number[]): number {
    if (deltas.length === 0) return 0
    const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length
    return avgDelta > 0 ? 1000 / avgDelta : 0
  }

  private computeMinFps(deltas: number[]): number {
    if (deltas.length === 0) return 0
    const maxDelta = Math.max(...deltas)
    return maxDelta > 0 ? 1000 / maxDelta : 0
  }

  private countFrameDrops(deltas: number[]): number {
    // 30fps 미만 = 33ms 초과하는 프레임
    return deltas.filter(d => d > 33).length
  }
}

export function countDomNodes(): number {
  return document.querySelectorAll('*').length
}

export function getMemoryUsage(): number | null {
  const perf = performance as Performance & {
    memory?: { usedJSHeapSize: number }
  }
  return perf.memory?.usedJSHeapSize ?? null
}
