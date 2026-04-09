import { useState, useEffect, useRef, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { generateMessages, loadNextBatch } from '@shared/data'
import type { MessageCount, Scenario, MessageData, BenchmarkConfig } from '@shared/types'
import { createControlPanel, updateMetrics, type ControlPanelElements } from '@shared/control-panel'
import { MetricsCollector, countDomNodes, getMemoryUsage } from '@shared/metrics'
import { AutoBenchmark } from '@shared/benchmark'
import { ChatBubble } from '../no-virtualization/ChatBubble'

export function App() {
  const [messages, setMessages] = useState<MessageData[]>([])
  const [count, setCount] = useState<MessageCount>(1000)
  const [scenario, setScenario] = useState<Scenario>('fixed')
  const containerRef = useRef<HTMLDivElement>(null)
  const controlPanelRef = useRef<ControlPanelElements | null>(null)
  const benchmarkRef = useRef<AutoBenchmark | null>(null)
  const metricsRef = useRef(new MetricsCollector())

  // 컨트롤 패널
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

  // 데이터 생성
  useEffect(() => {
    const start = performance.now()
    if (scenario === 'fixed') {
      setMessages(generateMessages(count))
    } else {
      setMessages(generateMessages(100))
    }
    requestAnimationFrame(() => {
      const mountTime = performance.now() - start
      metricsRef.current.setMountTime(mountTime)
      if (controlPanelRef.current) {
        updateMetrics(controlPanelRef.current, 0, countDomNodes(), null, mountTime)
      }
    })
  }, [count, scenario])

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 80,
    overscan: 5,
  })

  // AutoBenchmark
  useEffect(() => {
    if (!containerRef.current || !controlPanelRef.current) return
    const config: BenchmarkConfig = { mode: 'react-virtual', count, scenario }
    benchmarkRef.current = new AutoBenchmark(containerRef.current, controlPanelRef.current, config)
    return () => benchmarkRef.current?.stop()
  }, [count, scenario])

  // 무한 스크롤
  const handleScroll = useCallback(() => {
    if (scenario !== 'infinite') return
    const el = containerRef.current
    if (!el) return
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      setMessages(prev => loadNextBatch(prev, 50))
    }
  }, [scenario])

  // 실시간 FPS
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
        updateMetrics(controlPanelRef.current, r.avgFps, r.peakDomNodes,
          r.memoryPeak !== null ? r.memoryPeak / 1024 / 1024 : null, r.mountTime)
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])

  const items = virtualizer.getVirtualItems()

  return (
    <div
      className="chat-container"
      ref={containerRef}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {items.map(virtualItem => (
          <div
            key={virtualItem.key}
            ref={virtualizer.measureElement}
            data-index={virtualItem.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ChatBubble message={messages[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
