import { Marked } from 'marked'
import type { MessageSeed, MessageData } from './types'

const marked = new Marked()

export const MESSAGE_SEEDS: MessageSeed[] = [
  { role: 'user', markdown: 'Hello!' },
  { role: 'assistant', markdown: '# Welcome\n\nThis is a **markdown** demo.' },

  { role: 'user', markdown: 'Can we treat the rich-text inline flow helper as a real primitive, or is it only good for one tiny demo?' },
  { role: 'assistant', markdown: 'Short answer: **yes, inside a bounded corridor**.\n\nIt already handles rich-text inline flow, `code`, and links like [Pretext](https://github.com/chenglou/pretext), while keeping pills and badges atomic.' },

  { role: 'user', markdown: 'What does a chat renderer actually need?' },
  { role: 'assistant', markdown: '### What a chat renderer actually needs\n\n1. Parse markdown somewhere else.\n2. Normalize it into blocks and inline runs.\n3. Use the rich-text inline flow helper for paragraph content.\n4. Use the `pre-wrap` path for fenced code.' },

  { role: 'user', markdown: 'ok' },
  { role: 'assistant', markdown: 'Yep.' },

  { role: 'user', markdown: 'Show me a code example.' },
  { role: 'assistant', markdown: '```ts\nconst frame = buildConversationFrame(templates, width)\nconst visible = findVisibleRange(frame, scrollTop, viewportHeight)\nrenderMessages(frame, visible.start, visible.end)\n```' },

  { role: 'user', markdown: 'I also want code fences, quotes, and lists to show up often enough that the 10k-thread run actually teaches us something.' },
  { role: 'assistant', markdown: 'That part is important.\n\n- paragraph layout is one leaf\n- code fences are another leaf\n- the chat message is the block-level container above both\n\nThe assistant side is the real stress test because it keeps hitting headings, bullets, quotes, and code fences.' },

  { role: 'user', markdown: 'Try a checklist too. A product chat is full of little status updates.' },
  { role: 'assistant', markdown: 'Current polish pass:\n\n- lighter body copy is in\n- the assistant lane is bubble-less\n- exact height prediction is wired up\n- mobile screenshot smoke tests still remain' },

  { role: 'user', markdown: 'Give me one answer that feels more structured, almost like a mini design review.' },
  { role: 'assistant', markdown: '## Design review\n\nThe strongest signal so far is that **assistant messages want a different presentation contract from user messages**. The human side reads well as compact bubbles. The assistant side reads better as content on a surface with room to breathe.\n\nThat split also maps nicely to the measurement model because user messages are usually short and AI responses are much more likely to hit rich block transitions.' },

  { role: 'user', markdown: 'And one answer that feels operational, like we are handing this to another engineer.' },
  { role: 'assistant', markdown: '```json\n{\n  "parser": "marked",\n  "paragraphLeaf": "rich-text-inline-flow",\n  "codeLeaf": "pre-wrap",\n  "virtualization": "exact-height-first",\n  "openRisk": "long-scroll-device-smoke"\n}\n```' },

  { role: 'user', markdown: 'What about quotes?' },
  { role: 'assistant', markdown: '> If we know the exact height in advance, then virtualization is no longer guesswork.\n>\n> It becomes geometry.\n\nThat is the whole reason to keep the primitive low-level and composable.' },

  { role: 'user', markdown: 'Can you make one answer about search or citations? AI chats have that vibe a lot now.' },
  { role: 'assistant', markdown: 'Sure. A citation-heavy answer is mostly the same inline problem with a little more link density:\n\n- [spec note](https://example.com/spec)\n- [issue thread](https://example.com/issues/431)\n- [benchmark doc](https://example.com/benchmarks)' },

  { role: 'user', markdown: 'I want at least one answer that uses nested bullets so we can see whether the second level still reads okay.' },
  { role: 'assistant', markdown: 'Things to watch:\n\n- top-level bullets should feel close to body text\n- nested bullets can indent, but only when they truly nest\n- quotes and code fences should tuck closer to the lead-in paragraph' },

  { role: 'user', markdown: 'cool. also make sure the scroll still feels stable when widths change' },
  { role: 'assistant', markdown: 'That is one of the better parts of the demo right now: width changes rebuild the frame, preserve relative scroll intent, and remount only the visible window.' },

  { role: 'user', markdown: 'Show me a longer code block.' },
  { role: 'assistant', markdown: '```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n```' },

  { role: 'user', markdown: 'I got this error:\n\n```\nTypeError: Cannot read properties of undefined\n```\n\nWhat could be wrong?' },
  { role: 'assistant', markdown: 'Virtual scrolling works by only rendering items that are currently visible in the viewport.\n\nThe key challenge is knowing the height of each item **before** it is rendered. Traditional approaches measure after render, which causes layout shifts.\n\nPretext solves this by using Canvas `measureText()` to calculate text dimensions purely through arithmetic — no DOM needed.' },

  { role: 'user', markdown: 'How does the complexity compare?' },
  { role: 'assistant', markdown: 'Time complexity comparison:\n\n- No Virt: render O(n), scroll O(1)\n- React Virtual: render O(k), height measurement O(k), k = visible items\n- Pretext: prepare O(n), render O(k), search O(log n)\n\nHere n is total messages and k is visible messages on screen.\n\nAt 10,000 messages, k is around 15-20, so virtualization benefits are maximized.' },

  { role: 'user', markdown: 'One last thing: keep the hypothesis space open.' },
  { role: 'assistant', markdown: 'The good version of this alpha API is not "we solved rich text." It is "we found a low-level paragraph leaf that keeps the hypothesis space open for a richer block model above it."' },
]

function parseMarkdown(md: string): string {
  return marked.parse(md) as string
}

export function generateMessages(count: number): MessageData[] {
  const messages: MessageData[] = []
  for (let i = 0; i < count; i++) {
    const seed = MESSAGE_SEEDS[i % MESSAGE_SEEDS.length]
    messages.push({
      id: i,
      role: seed.role,
      markdown: seed.markdown,
      html: parseMarkdown(seed.markdown),
    })
  }
  return messages
}

export function loadNextBatch(existing: MessageData[], batchSize = 50): MessageData[] {
  const startId = existing.length
  const batch: MessageData[] = []
  for (let i = 0; i < batchSize; i++) {
    const seed = MESSAGE_SEEDS[(startId + i) % MESSAGE_SEEDS.length]
    batch.push({
      id: startId + i,
      role: seed.role,
      markdown: seed.markdown,
      html: parseMarkdown(seed.markdown),
    })
  }
  return [...existing, ...batch]
}
