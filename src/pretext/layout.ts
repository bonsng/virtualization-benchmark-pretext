import { prepare, layout } from '@chenglou/pretext'
import type { MessageData } from '@shared/types'

// 각 마크다운 블록 타입에 대응하는 폰트/라인 높이 설정
const FONTS = {
  body: '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h1: 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  h2: 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  code: '14px "SF Mono", "Fira Code", "Cascadia Code", monospace',
} as const

const LINE_HEIGHTS = { body: 21, h1: 28, h2: 24, code: 20 } as const

// 버블 padding (top+bottom) + margin-bottom
const BUBBLE_PADDING = 20 + 8

/**
 * 메시지의 높이를 pretext로 사전 계산한다.
 * markdown을 간이 파싱하여 블록별로 prepare+layout을 수행하고 합산한다.
 */
export function measureMessageHeight(message: MessageData, containerWidth: number): number {
  const bubbleWidth = containerWidth * 0.7 - 28 // max-width 70% - padding 14*2
  const blocks = splitIntoBlocks(message.markdown)
  let totalHeight = 0

  for (const block of blocks) {
    if (block.type === 'code') {
      const prepared = prepare(block.text, FONTS.code, { whiteSpace: 'pre-wrap' })
      const result = layout(prepared, bubbleWidth - 20, LINE_HEIGHTS.code) // code padding
      totalHeight += result.height + 20 + 10 // padding + margin
    } else if (block.type === 'h1') {
      const prepared = prepare(block.text, FONTS.h1)
      const result = layout(prepared, bubbleWidth, LINE_HEIGHTS.h1)
      totalHeight += result.height + 6
    } else if (block.type === 'h2') {
      const prepared = prepare(block.text, FONTS.h2)
      const result = layout(prepared, bubbleWidth, LINE_HEIGHTS.h2)
      totalHeight += result.height + 6
    } else {
      const prepared = prepare(block.text, FONTS.body)
      const result = layout(prepared, bubbleWidth, LINE_HEIGHTS.body)
      totalHeight += result.height + 8 // paragraph margin
    }
  }

  return totalHeight + BUBBLE_PADDING
}

interface TextBlock {
  type: 'body' | 'h1' | 'h2' | 'code'
  text: string
}

/**
 * 마크다운을 간이 파싱하여 블록으로 분리한다.
 * 정확한 HTML 파싱 대신, 높이 계산에 필요한 수준의 블록 분리만 수행.
 */
function splitIntoBlocks(markdown: string): TextBlock[] {
  const blocks: TextBlock[] = []
  const lines = markdown.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 코드 블록
    if (line.startsWith('```')) {
      const codeLines: string[] = []
      i++ // skip opening fence
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing fence
      if (codeLines.length > 0) {
        blocks.push({ type: 'code', text: codeLines.join('\n') })
      }
      continue
    }

    // 헤더
    if (line.startsWith('# ')) {
      blocks.push({ type: 'h1', text: line.slice(2) })
      i++
      continue
    }
    if (line.startsWith('## ')) {
      blocks.push({ type: 'h2', text: line.slice(3) })
      i++
      continue
    }

    // 빈 줄 스킵
    if (line.trim() === '' || line.trim() === '---') {
      i++
      continue
    }

    // 일반 텍스트 (인라인 마크다운 제거)
    const cleanLine = line
      .replace(/\*\*(.*?)\*\*/g, '$1')  // bold
      .replace(/`(.*?)`/g, '$1')         // inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // links
      .replace(/^>\s*/, '')               // blockquote
      .replace(/^\d+\.\s*/, '')           // ordered list
      .replace(/^[-*]\s*/, '')            // unordered list

    blocks.push({ type: 'body', text: cleanLine })
    i++
  }

  return blocks
}

/**
 * 개별 높이 배열 → 누적 높이 배열.
 * cumulative[i] = heights[0] + ... + heights[i]
 */
export function computeCumulativeHeights(heights: number[]): number[] {
  const cumulative: number[] = []
  let sum = 0
  for (const h of heights) {
    sum += h
    cumulative.push(sum)
  }
  return cumulative
}

/**
 * 이진 탐색으로 가시 영역의 [start, end) 범위를 반환한다.
 * @param cumulative 누적 높이 배열
 * @param scrollTop 현재 스크롤 위치
 * @param viewportHeight 뷰포트 높이
 * @returns { start, end } 인덱스 (end는 exclusive)
 */
export function findVisibleRange(
  cumulative: number[],
  scrollTop: number,
  viewportHeight: number,
): { start: number; end: number } {
  if (cumulative.length === 0) return { start: 0, end: 0 }

  const totalHeight = cumulative[cumulative.length - 1]
  if (scrollTop >= totalHeight) {
    return { start: cumulative.length, end: cumulative.length }
  }

  // start: scrollTop 이상인 첫 아이템의 인덱스
  // 아이템 i의 top = cumulative[i-1] (i=0이면 0), bottom = cumulative[i]
  // scrollTop에 걸치는 아이템 = bottom > scrollTop인 첫 아이템
  let lo = 0
  let hi = cumulative.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (cumulative[mid] <= scrollTop) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  const start = lo

  // end: scrollTop + viewportHeight를 넘는 첫 아이템의 다음 인덱스
  const visibleBottom = scrollTop + viewportHeight
  lo = start
  hi = cumulative.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    const itemTop = mid > 0 ? cumulative[mid - 1] : 0
    if (itemTop < visibleBottom) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  // lo가 가리키는 아이템의 top이 visibleBottom 이상이면 lo가 end
  const lastTop = lo > 0 ? cumulative[lo - 1] : 0
  const end = lastTop < visibleBottom ? lo + 1 : lo

  return { start, end: Math.min(end, cumulative.length) }
}

/**
 * 전체 메시지 배열의 높이를 사전 계산하고 가상화에 필요한 데이터를 반환한다.
 */
export interface LayoutData {
  heights: number[]
  cumulative: number[]
  totalHeight: number
}

export function computeLayout(messages: MessageData[], containerWidth: number): LayoutData {
  const heights = messages.map(msg => measureMessageHeight(msg, containerWidth))
  const cumulative = computeCumulativeHeights(heights)
  const totalHeight = cumulative.length > 0 ? cumulative[cumulative.length - 1] : 0
  return { heights, cumulative, totalHeight }
}

/**
 * 기존 레이아웃에 새 메시지를 추가한다 (무한 스크롤용).
 */
export function appendToLayout(
  existing: LayoutData,
  newMessages: MessageData[],
  containerWidth: number,
): LayoutData {
  const newHeights = newMessages.map(msg => measureMessageHeight(msg, containerWidth))
  const heights = [...existing.heights, ...newHeights]
  let sum = existing.totalHeight
  const cumulative = [...existing.cumulative]
  for (const h of newHeights) {
    sum += h
    cumulative.push(sum)
  }
  return { heights, cumulative, totalHeight: sum }
}
