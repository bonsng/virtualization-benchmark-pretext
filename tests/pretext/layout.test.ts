import { describe, it, expect } from 'vitest'
import { findVisibleRange, type ConversationFrame, type ChatMessageInstance } from '../../src/pretext/layout'

function makeFrame(heights: number[]): ConversationFrame {
  const gap = 12 // MESSAGE_GAP from demo
  const messages: ChatMessageInstance[] = []
  let y = 0
  for (let i = 0; i < heights.length; i++) {
    const top = y
    const bottom = top + heights[i]
    messages.push({
      top,
      bottom,
      prepared: {} as any,
      frame: {} as any,
    })
    y = bottom + gap
  }
  return {
    chatWidth: 600,
    messages,
    occlusionBannerHeight: 0,
    totalHeight: heights.length > 0 ? y - gap : 0,
  }
}

describe('findVisibleRange', () => {
  const frame = makeFrame([50, 80, 30, 100, 50, 90, 50, 50, 80, 70])
  // with gap=12:
  // item 0: top=0, bottom=50
  // item 1: top=62, bottom=142
  // item 2: top=154, bottom=184
  // item 3: top=196, bottom=296
  // item 4: top=308, bottom=358
  // ...

  it('finds correct range at top', () => {
    const { start, end } = findVisibleRange(frame, 0, 200, 0, 0)
    expect(start).toBe(0)
    expect(end).toBe(4)
  })

  it('finds correct range in middle', () => {
    const { start, end } = findVisibleRange(frame, 160, 200, 0, 0)
    // visible: 160..360
    // item 2: bottom=184 > 160
    // item 4: bottom=358 < 360
    expect(start).toBe(2)
    expect(end).toBe(5)
  })

  it('returns empty range when scrolled past end', () => {
    const { start, end } = findVisibleRange(frame, 2000, 200, 0, 0)
    expect(start).toBe(end)
  })

  it('handles empty frame', () => {
    const empty = makeFrame([])
    const { start, end } = findVisibleRange(empty, 0, 200, 0, 0)
    expect(start).toBe(0)
    expect(end).toBe(0)
  })
})
