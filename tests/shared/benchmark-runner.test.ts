import { describe, it, expect, vi } from 'vitest'
import { median, BenchmarkRunner, type BenchmarkCallbacks } from '../../src/shared/benchmark-runner'

describe('median', () => {
  it('returns middle value for odd-length array', () => {
    expect(median([3, 1, 2])).toBe(2)
  })

  it('returns average of two middle values for even-length array', () => {
    expect(median([4, 1, 3, 2])).toBe(2.5)
  })

  it('returns single value', () => {
    expect(median([42])).toBe(42)
  })
})

describe('BenchmarkRunner', () => {
  it('runs 3 rounds and returns median results', async () => {
    let roundCount = 0
    const mockCallbacks: BenchmarkCallbacks = {
      reload: vi.fn(),
      waitForPaint: () => Promise.resolve(),
      getScrollContainer: () => {
        const div = document.createElement('div')
        Object.defineProperties(div, {
          scrollTop: { value: 0, writable: true },
          clientHeight: { value: 100, configurable: true },
          scrollHeight: { value: 100, configurable: true },
        })
        return div
      },
    }

    const runner = new BenchmarkRunner(mockCallbacks, {
      mode: 'no-virtualization',
      count: 1000,
      scenario: 'fixed',
    })

    const result = await runner.run()
    expect(result.rounds).toBe(3)
    expect(result.mountTime).toBeGreaterThanOrEqual(0)
    expect(result.peakDomNodes).toBeGreaterThanOrEqual(0)
    expect(result.resizeTime).toBeGreaterThanOrEqual(0)
    expect(mockCallbacks.reload).toHaveBeenCalledTimes(3)
  })
})
