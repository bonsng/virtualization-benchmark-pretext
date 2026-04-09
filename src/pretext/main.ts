import type { MessageCount, Scenario, BenchmarkConfig } from '@shared/types'
import { createControlPanel, updateMetrics, type ControlPanelElements } from '@shared/control-panel'
import { MetricsCollector, countDomNodes, getMemoryUsage } from '@shared/metrics'
import { AutoBenchmark } from '@shared/benchmark'
import {
  createPreparedChatTemplates,
  buildConversationFrame,
  findVisibleRange,
  type ConversationFrame,
} from './layout'
import { ChatRenderer } from './renderer'

// State
let messageCount = 1000
let count: MessageCount = 1000
let scenario: Scenario = 'fixed'
let frame: ConversationFrame | null = null
let prevChatWidth = 0
let controlPanel: ControlPanelElements
let benchmark: AutoBenchmark | null = null
const metrics = new MetricsCollector()

// DOM
const app = document.getElementById('app')!
const scrollContainer = document.createElement('div')
scrollContainer.className = 'chat-container'
app.appendChild(scrollContainer)

const renderer = new ChatRenderer(scrollContainer)

// Prepare templates (expensive, once)
const templates = createPreparedChatTemplates()

// Control panel
controlPanel = createControlPanel({
  onCountChange: (c) => { count = c; reload() },
  onScenarioChange: (s) => { scenario = s; reload() },
  onBenchmarkStart: () => benchmark?.start(),
})
document.body.prepend(controlPanel.container)

function reload(): void {
  const start = performance.now()

  if (scenario === 'fixed') {
    messageCount = count
  } else {
    messageCount = 100
  }

  renderer.clear()
  frame = null
  prevChatWidth = 0
  scrollContainer.scrollTop = 0
  render()

  requestAnimationFrame(() => {
    const mountTime = performance.now() - start
    metrics.setMountTime(mountTime)
    updateMetrics(controlPanel, 0, countDomNodes(), null, mountTime)
  })

  const config: BenchmarkConfig = { mode: 'pretext', count, scenario }
  benchmark?.stop()
  benchmark = new AutoBenchmark(scrollContainer, controlPanel, config)
}

function render(): void {
  const containerWidth = scrollContainer.clientWidth
  const chatWidth = Math.max(240, containerWidth)
  const scrollTop = scrollContainer.scrollTop
  const viewportHeight = scrollContainer.clientHeight

  const canReuseFrame = frame !== null && prevChatWidth === chatWidth
  const needsRelayout = !canReuseFrame

  if (!canReuseFrame) {
    frame = buildConversationFrame(templates, chatWidth, 0, messageCount)
    prevChatWidth = chatWidth
  }

  const { start, end } = findVisibleRange(frame!, scrollTop, viewportHeight, 0, 0)
  renderer.render(frame!, start, end, needsRelayout)
}

// 스크롤 이벤트
let scheduledRaf: number | null = null
function scheduleRender(): void {
  if (scheduledRaf !== null) return
  scheduledRaf = requestAnimationFrame(() => {
    scheduledRaf = null
    render()

    if (scenario === 'infinite') {
      const el = scrollContainer
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
        messageCount += 50
        frame = null
        prevChatWidth = 0
        render()
      }
    }
  })
}

scrollContainer.addEventListener('scroll', scheduleRender, { passive: true })
window.addEventListener('resize', () => {
  const start = performance.now()
  frame = null
  prevChatWidth = 0
  render()
  metrics.setResizeTime(performance.now() - start)
})

// 실시간 메트릭
function metricsLoop(ts: number): void {
  metrics.recordFrame(ts)
  metrics.recordDomNodes(countDomNodes())
  const mem = getMemoryUsage()
  if (mem !== null) metrics.recordMemory(mem)
  const r = metrics.getResults()
  updateMetrics(controlPanel, r.avgFps, r.peakDomNodes,
    r.memoryPeak !== null ? r.memoryPeak / 1024 / 1024 : null, r.mountTime)
  requestAnimationFrame(metricsLoop)
}
requestAnimationFrame(metricsLoop)

// 초기 로드
reload()
