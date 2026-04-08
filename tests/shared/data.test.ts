import { describe, it, expect } from 'vitest'
import { generateMessages, loadNextBatch, MESSAGE_SEEDS } from '@shared/data'

describe('generateMessages', () => {
  it('generates the requested number of messages', () => {
    const messages = generateMessages(100)
    expect(messages).toHaveLength(100)
  })

  it('assigns sequential ids starting from 0', () => {
    const messages = generateMessages(30)
    expect(messages[0].id).toBe(0)
    expect(messages[29].id).toBe(29)
  })

  it('cycles through seeds', () => {
    const messages = generateMessages(MESSAGE_SEEDS.length + 1)
    expect(messages[0].markdown).toBe(messages[MESSAGE_SEEDS.length].markdown)
  })

  it('includes parsed html in each message', () => {
    const messages = generateMessages(1)
    expect(messages[0].html).toContain('<') // marked로 파싱된 HTML
  })
})

describe('loadNextBatch', () => {
  it('appends batchSize messages after existing', () => {
    const existing = generateMessages(10)
    const updated = loadNextBatch(existing, 50)
    expect(updated).toHaveLength(60)
    expect(updated[10].id).toBe(10)
  })

  it('defaults to 50 batch size', () => {
    const updated = loadNextBatch([], 50)
    expect(updated).toHaveLength(50)
  })
})
