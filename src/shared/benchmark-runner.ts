import type { BenchmarkConfig, BenchmarkResult, RoundResult } from './types'
import { benchmarkKey } from './types'

export interface BenchmarkCallbacks {
  /** 데이터 재생성 + 렌더 트리거 */
  reload: () => void
  /** reload() 후 paint 완료까지 대기. 모드별로 다르게 구현 */
  waitForPaint: () => Promise<void>
  /** 스크롤 컨테이너 반환 */
  getScrollContainer: () => HTMLElement
  /** 벤치마크 진행 상태 콜백 (optional) */
  onProgress?: (status: string) => void
}

export function doubleRaf(): Promise<void> {
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export class BenchmarkRunner {
  private running = false

  constructor(
    private callbacks: BenchmarkCallbacks,
    private config: BenchmarkConfig,
  ) {}

  async run(): Promise<BenchmarkResult> {
    this.running = true
    const rounds: RoundResult[] = []

    for (let i = 0; i < 3; i++) {
      this.callbacks.onProgress?.(`Round ${i + 1}/3 — Mounting...`)
      const round = await this.runRound(i + 1)
      rounds.push(round)
    }

    this.running = false

    const result: BenchmarkResult = {
      timestamp: Date.now(),
      rounds: 3,
      mountTime: median(rounds.map(r => r.mountTime)),
      peakDomNodes: median(rounds.map(r => r.peakDomNodes)),
      resizeTime: median(rounds.map(r => r.resizeTime)),
    }

    localStorage.setItem(benchmarkKey(this.config), JSON.stringify(result))
    return result
  }

  stop(): void {
    this.running = false
  }

  private async runRound(roundNum: number): Promise<RoundResult> {
    // Phase 1: Mount
    this.callbacks.onProgress?.(`Round ${roundNum}/3 — Mounting...`)
    const mountTime = await this.measureMount()

    // Phase 2: Scroll (DOM 노드 수 수집)
    this.callbacks.onProgress?.(`Round ${roundNum}/3 — Scrolling...`)
    const peakDomNodes = await this.measureScroll()

    // Phase 3: Resize
    this.callbacks.onProgress?.(`Round ${roundNum}/3 — Resizing...`)
    const resizeTime = await this.measureResize()

    return { mountTime, peakDomNodes, resizeTime }
  }

  private async measureMount(): Promise<number> {
    const container = this.callbacks.getScrollContainer()
    container.scrollTop = 0

    const start = performance.now()
    this.callbacks.reload()
    await this.callbacks.waitForPaint()
    return performance.now() - start
  }

  private async measureScroll(): Promise<number> {
    const container = this.callbacks.getScrollContainer()
    container.scrollTop = 0
    await doubleRaf()

    let peakDomNodes = 0

    return new Promise<number>(resolve => {
      const tick = () => {
        if (!this.running) { resolve(peakDomNodes); return }

        const count = container.querySelectorAll('*').length
        if (count > peakDomNodes) peakDomNodes = count

        const step = Math.max(1, Math.floor(container.clientHeight * 0.05))
        container.scrollTop += step

        const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 10
        if (atBottom) {
          resolve(peakDomNodes)
          return
        }

        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  private async measureResize(): Promise<number> {
    const container = this.callbacks.getScrollContainer()
    const originalWidth = container.style.width
    await doubleRaf()

    const start = performance.now()
    container.style.width = '80%'
    container.dispatchEvent(new Event('resize'))
    window.dispatchEvent(new Event('resize'))
    await doubleRaf()
    const elapsed = performance.now() - start

    container.style.width = originalWidth
    window.dispatchEvent(new Event('resize'))
    await doubleRaf()

    return elapsed
  }
}
