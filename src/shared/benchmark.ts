import { MetricsCollector, countDomNodes, getMemoryUsage } from './metrics'
import type { BenchmarkConfig, BenchmarkResult } from './types'
import { benchmarkKey } from './types'
import { showStatus, updateMetrics, type ControlPanelElements } from './control-panel'

export class AutoBenchmark {
  private collector = new MetricsCollector()
  private rafId = 0
  private running = false

  constructor(
    private scrollContainer: HTMLElement,
    private controlPanel: ControlPanelElements,
    private config: BenchmarkConfig,
  ) {}

  updateConfig(config: Partial<BenchmarkConfig>): void {
    Object.assign(this.config, config)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.collector.reset()
    this.controlPanel.startButton.disabled = true
    this.controlPanel.startButton.textContent = '⏳ 측정 중...'

    // 자동 스크롤 + 메트릭 수집: viewport 절반씩 스크롤
    const container = this.scrollContainer
    const scrollStep = Math.max(Math.floor(container.clientHeight / 2), 100)

    const tick = (timestamp: number) => {
      if (!this.running) return

      this.collector.recordFrame(timestamp)
      this.collector.recordDomNodes(countDomNodes())
      const mem = getMemoryUsage()
      if (mem !== null) this.collector.recordMemory(mem)

      // 실시간 메트릭 표시
      const results = this.collector.getResults()
      updateMetrics(
        this.controlPanel,
        results.avgFps,
        results.peakDomNodes,
        results.memoryPeak !== null ? results.memoryPeak / 1024 / 1024 : null,
        results.mountTime,
      )

      // 자동 스크롤
      container.scrollTop += scrollStep
      const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10

      if (atBottom) {
        this.finish()
        return
      }

      this.rafId = requestAnimationFrame(tick)
    }

    // 맨 위로 스크롤 후 시작
    container.scrollTop = 0
    this.rafId = requestAnimationFrame(tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)
    this.controlPanel.startButton.disabled = false
    this.controlPanel.startButton.textContent = '▶ 벤치마크 시작'
  }

  setMountTime(ms: number): void {
    this.collector.setMountTime(ms)
  }

  getResults(): BenchmarkResult {
    return this.collector.getResults()
  }

  private finish(): void {
    this.running = false
    cancelAnimationFrame(this.rafId)

    const results = this.collector.getResults()
    const key = benchmarkKey(this.config)
    localStorage.setItem(key, JSON.stringify(results))

    this.controlPanel.startButton.disabled = false
    this.controlPanel.startButton.textContent = '▶ 벤치마크 시작'
    showStatus(`저장 완료: ${key}`)
  }
}
