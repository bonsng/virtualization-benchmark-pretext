import type { MessageCount, Scenario, BenchmarkConfig } from '@shared/types'
import { benchmarkKey } from '@shared/types'
import { createControlPanel, updateMetrics, showStatus, type ControlPanelElements } from '@shared/control-panel'
import { BenchmarkRunner, doubleRaf, type BenchmarkCallbacks } from '@shared/benchmark-runner'
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

// DOM
const app = document.getElementById('app')!
const scrollContainer = document.createElement('div')
scrollContainer.className = 'chat-container'
app.appendChild(scrollContainer)

const renderer = new ChatRenderer(scrollContainer)
const templates = createPreparedChatTemplates()

// Control panel
controlPanel = createControlPanel({
  onCountChange: (c) => { count = c; reload() },
  onScenarioChange: (s) => { scenario = s; reload() },
  onBenchmarkStart: () => runBenchmark(),
})
document.body.prepend(controlPanel.container)

function reload(): void {
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

    // DOM 읽기를 쓰기(render) 전에 수행하여 강제 레이아웃 방지
    const scrollTop = scrollContainer.scrollTop
    const viewportHeight = scrollContainer.clientHeight

    render()

    if (scenario === 'infinite') {
      // frame.totalHeight 사용 — DOM의 scrollHeight 조회 없이 판단
      if (scrollTop + viewportHeight >= frame!.totalHeight - 100) {
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
  frame = null
  prevChatWidth = 0
  render()
})

function runBenchmark(): void {
  const callbacks: BenchmarkCallbacks = {
    reload: () => reload(),
    waitForPaint: () => doubleRaf(),
    getScrollContainer: () => scrollContainer,
    onProgress: (status) => {
      controlPanel.startButton.textContent = `⏳ ${status}`
    },
  }

  const config: BenchmarkConfig = { mode: 'pretext', count, scenario }
  const runner = new BenchmarkRunner(callbacks, config)

  controlPanel.startButton.disabled = true
  runner.run().then(result => {
    controlPanel.startButton.disabled = false
    controlPanel.startButton.textContent = '▶ 벤치마크 시작'
    updateMetrics(controlPanel, result.mountTime, result.peakDomNodes, result.resizeTime)
    showStatus(`저장 완료: ${benchmarkKey(config)}`)
  })
}

// 초기 로드
reload()
