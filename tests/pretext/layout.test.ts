import { describe, it, expect } from 'vitest'
import { findVisibleRange, computeCumulativeHeights } from '../../src/pretext/layout'

describe('computeCumulativeHeights', () => {
  it('computes cumulative heights from individual heights', () => {
    const heights = [50, 80, 30, 100]
    const cumulative = computeCumulativeHeights(heights)
    expect(cumulative).toEqual([50, 130, 160, 260])
  })

  it('returns empty for empty input', () => {
    expect(computeCumulativeHeights([])).toEqual([])
  })
})

describe('findVisibleRange', () => {
  // cumulative: [50, 130, 160, 260, 310, 400, 450, 500, 580, 650]
  const heights = [50, 80, 30, 100, 50, 90, 50, 50, 80, 70]
  const cumulative = computeCumulativeHeights(heights)

  it('finds correct range at top', () => {
    const { start, end } = findVisibleRange(cumulative, 0, 200)
    expect(start).toBe(0)
    // scrollTop=0, viewportHeight=200 → visible bottom = 200
    // items 0(0-50), 1(50-130), 2(130-160), 3(160-260)
    // item 3 ends at 260 > 200, but starts at 160 < 200 → visible
    expect(end).toBe(4) // exclusive
  })

  it('finds correct range in middle', () => {
    // scrollTop=150, viewport=200 → visible 150..350
    const { start, end } = findVisibleRange(cumulative, 150, 200)
    // item 2 starts at 130, ends at 160 → visible (130 < 350, 160 > 150)
    // item 5 starts at 310, ends at 400 → visible (310 < 350)
    expect(start).toBe(2)
    expect(end).toBe(6) // exclusive
  })

  it('returns empty range when scrolled past end', () => {
    const { start, end } = findVisibleRange(cumulative, 700, 200)
    expect(start).toBe(end) // no visible items
  })
})
