import { describe, it, expect } from 'vitest'
import { MetricsCollector } from '@shared/metrics'

describe('MetricsCollector', () => {
  it('calculates average FPS from frame timestamps', () => {
    const collector = new MetricsCollector()
    // 60fps = 16.67ms per frame, simulate 10 frames
    const timestamps = Array.from({ length: 10 }, (_, i) => i * 16.67)
    for (const ts of timestamps) {
      collector.recordFrame(ts)
    }
    const result = collector.getResults()
    expect(result.avgFps).toBeGreaterThan(55)
    expect(result.avgFps).toBeLessThan(65)
  })

  it('tracks minimum FPS', () => {
    const collector = new MetricsCollector()
    // 대부분 60fps, 한 프레임만 느림 (100ms gap = 10fps)
    collector.recordFrame(0)
    collector.recordFrame(16.67)
    collector.recordFrame(33.34)
    collector.recordFrame(133.34) // 100ms gap
    collector.recordFrame(150.01)
    const result = collector.getResults()
    expect(result.minFps).toBeLessThan(15)
  })

  it('counts frame drops (frames > 33ms)', () => {
    const collector = new MetricsCollector()
    collector.recordFrame(0)
    collector.recordFrame(16)    // OK
    collector.recordFrame(60)    // drop (44ms)
    collector.recordFrame(76)    // OK
    collector.recordFrame(130)   // drop (54ms)
    const result = collector.getResults()
    expect(result.frameDrops).toBe(2)
  })

  it('records mount time', () => {
    const collector = new MetricsCollector()
    collector.setMountTime(42.5)
    const result = collector.getResults()
    expect(result.mountTime).toBe(42.5)
  })

  it('records peak DOM node count', () => {
    const collector = new MetricsCollector()
    collector.recordDomNodes(100)
    collector.recordDomNodes(500)
    collector.recordDomNodes(200)
    const result = collector.getResults()
    expect(result.peakDomNodes).toBe(500)
  })
})
