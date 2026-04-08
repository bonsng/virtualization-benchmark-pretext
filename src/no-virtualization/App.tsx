import { useState, useEffect, useRef, useCallback } from 'react'
import { generateMessages, loadNextBatch } from '@shared/data'
import type { MessageCount, Scenario, MessageData, BenchmarkConfig } from '@shared/types'
import { createControlPanel, updateMetrics, type ControlPanelElements } from '@shared/control-panel'
import { MetricsCollector, countDomNodes, getMemoryUsage } from '@shared/metrics'
import { AutoBenchmark } from '@shared/benchmark'
import { ChatBubble } from './ChatBubble'

export function App() {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [count, setCount] = useState<MessageCount>(1000)
  const [scenario, setScenario] = useState<Scenario>('fixed')
  const containerRef = useRef<HTMLDivElement>(null)
  const controlPanelRef = useRef<ControlPanelElements | null>(null)
  const benchmarkRef = useRef<AutoBenchmark | null>(null)
  const metricsRef = useRef(new MetricsCollector())

  // 컨트롤 패널 마운트 (한 번)
  useEffect(() => {
    const panel = createControlPanel({
      onCountChange: setCount,
      onScenarioChange: setScenario,
      onBenchmarkStart: () => benchmarkRef.current?.start(),
    })
    document.body.prepend(panel.container)
    controlPanelRef.current = panel
    return () => panel.container.remove()
  }, [])

  // 데이터 생성 + 마운트 시간 측정
  useEffect(() => {
    const start = performance.now()
    if (scenario === 'fixed') {
      setMessages(generateMessages(count))
    } else {
      setMessages(generateMessages(100)) // 무한 스크롤 초기 100개
    }
    // 마운트 시간은 다음 프레임에서 측정
    requestAnimationFrame(() => {
      const mountTime = performance.now() - start
      metricsRef.current.setMountTime(mountTime)
      if (controlPanelRef.current) {
        updateMetrics(controlPanelRef.current, 0, countDomNodes(), null, mountTime)
      }
    })
  }, [count, scenario])

  // AutoBenchmark 인스턴스
  useEffect(() => {
    if (!containerRef.current || !controlPanelRef.current) return
    const config: BenchmarkConfig = { mode: 'no-virtualization', count, scenario }
    benchmarkRef.current = new AutoBenchmark(containerRef.current, controlPanelRef.current, config)
    return () => benchmarkRef.current?.stop()
  }, [count, scenario])

  // 무한 스크롤 핸들러
  const handleScroll = useCallback(() => {
    if (scenario !== 'infinite') return
    const el = containerRef.current
    if (!el) return
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100
    if (nearBottom) {
      setMessages(prev => loadNextBatch(prev, 50))
    }
  }, [scenario])

  // 실시간 FPS 측정 (스크롤 중)
  useEffect(() => {
    const collector = metricsRef.current
    let rafId: number
    const tick = (ts: number) => {
      collector.recordFrame(ts)
      collector.recordDomNodes(countDomNodes())
      const mem = getMemoryUsage()
      if (mem !== null) collector.recordMemory(mem)

      if (controlPanelRef.current) {
        const r = collector.getResults()
        updateMetrics(
          controlPanelRef.current,
          r.avgFps, r.peakDomNodes,
          r.memoryPeak !== null ? r.memoryPeak / 1024 / 1024 : null,
          r.mountTime,
        )
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  return (
    <div className="chat-container" ref={containerRef} onScroll={handleScroll}>
      {messages.map(msg => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
    </div>
  )
}
