import { useState, useEffect, useRef, useCallback } from 'react'
import { generateMessages, loadNextBatch } from '@shared/data'
import type { MessageCount, Scenario, MessageData, BenchmarkConfig } from '@shared/types'
import { benchmarkKey } from '@shared/types'
import { createControlPanel, updateMetrics, showStatus, type ControlPanelElements } from '@shared/control-panel'
import { BenchmarkRunner, type BenchmarkCallbacks } from '@shared/benchmark-runner'
import { ChatBubble } from './ChatBubble'

export function App() {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [count, setCount] = useState<MessageCount>(1000)
  const [scenario, setScenario] = useState<Scenario>('fixed')
  const containerRef = useRef<HTMLDivElement>(null)
  const controlPanelRef = useRef<ControlPanelElements | null>(null)
  const paintResolveRef = useRef<(() => void) | null>(null)

  // 컨트롤 패널 마운트 (한 번)
  useEffect(() => {
    const panel = createControlPanel({
      onCountChange: setCount,
      onScenarioChange: setScenario,
      onBenchmarkStart: () => runBenchmark(),
    })
    document.body.prepend(panel.container)
    controlPanelRef.current = panel
    return () => panel.container.remove()
  }, [])

  // 데이터 생성
  useEffect(() => {
    if (scenario === 'fixed') {
      setMessages(generateMessages(count))
    } else {
      setMessages(generateMessages(100))
    }
  }, [count, scenario])

  // paint 완료 감지: useEffect(paint 후) → rAF(다음 프레임 직전)
  useEffect(() => {
    if (paintResolveRef.current) {
      requestAnimationFrame(() => {
        paintResolveRef.current?.()
        paintResolveRef.current = null
      })
    }
  }, [messages])

  // 무한 스크롤
  const handleScroll = useCallback(() => {
    if (scenario !== 'infinite') return
    const el = containerRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setMessages(prev => loadNextBatch(prev, 50))
    }
  }, [scenario])

  const runBenchmark = useCallback(() => {
    if (!containerRef.current || !controlPanelRef.current) return
    const panel = controlPanelRef.current

    const callbacks: BenchmarkCallbacks = {
      reload: () => {
        setMessages(generateMessages(count))
      },
      waitForPaint: () => new Promise<void>(resolve => {
        paintResolveRef.current = resolve
      }),
      getScrollContainer: () => containerRef.current!,
      onProgress: (status) => {
        panel.startButton.textContent = `⏳ ${status}`
      },
    }

    const config: BenchmarkConfig = { mode: 'no-virtualization', count, scenario }
    const runner = new BenchmarkRunner(callbacks, config)

    panel.startButton.disabled = true
    runner.run().then(result => {
      panel.startButton.disabled = false
      panel.startButton.textContent = '▶ 벤치마크 시작'
      updateMetrics(panel, result.mountTime, result.peakDomNodes, result.resizeTime)
      showStatus(`저장 완료: ${benchmarkKey(config)}`)
    })
  }, [count, scenario])

  return (
    <div className="chat-container" ref={containerRef} onScroll={handleScroll}>
      {messages.map(msg => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
    </div>
  )
}
