import {
  createPreparedChatTemplates,
  materializeTemplateBlocks,
  CODE_LINE_HEIGHT,
  CODE_BLOCK_PADDING_X,
  CODE_BLOCK_PADDING_Y,
  type ConversationFrame,
  type ChatMessageInstance,
  type TemplateFrame,
  type BlockLayout,
  type InlineFragmentLayout,
} from './layout'

type CachedRow = {
  bubble: HTMLDivElement
  row: HTMLElement
}

export class ChatRenderer {
  private canvas: HTMLDivElement
  private rows: Array<CachedRow | undefined> = []
  private mountedStart = 0
  private mountedEnd = 0

  constructor(parent: HTMLElement) {
    this.canvas = document.createElement('div')
    this.canvas.className = 'chat-canvas'
    parent.appendChild(this.canvas)
  }

  render(
    frame: ConversationFrame,
    start: number,
    end: number,
    needsRelayout: boolean,
  ): void {
    this.canvas.style.height = `${frame.totalHeight}px`

    const prevStart = this.mountedStart
    const prevEnd = this.mountedEnd

    // 범위 밖 노드 제거
    for (let i = prevStart; i < Math.min(prevEnd, start); i++) {
      const node = this.rows[i]
      if (node === undefined) continue
      node.row.remove()
      this.rows[i] = undefined
    }
    for (let i = Math.max(prevStart, end); i < prevEnd; i++) {
      const node = this.rows[i]
      if (node === undefined) continue
      node.row.remove()
      this.rows[i] = undefined
    }

    // 가시 범위 렌더
    for (let i = start; i < end; i++) {
      const msg = frame.messages[i]!
      let cached = this.rows[i]

      if (!cached) {
        cached = createMessageShell(msg.frame.role)
        this.rows[i] = cached
        renderMessageContents(cached.bubble, msg)
      } else if (needsRelayout) {
        renderMessageContents(cached.bubble, msg)
      }

      projectMessageNode(cached, msg.frame, msg.top)

      if (!cached.row.parentNode) {
        this.canvas.appendChild(cached.row)
      }
    }

    this.mountedStart = start
    this.mountedEnd = end
  }

  clear(): void {
    for (let i = this.mountedStart; i < this.mountedEnd; i++) {
      const node = this.rows[i]
      if (node) node.row.remove()
      this.rows[i] = undefined
    }
    this.rows = []
    this.mountedStart = 0
    this.mountedEnd = 0
    this.canvas.style.height = '0px'
  }
}

function createMessageShell(role: 'assistant' | 'user'): CachedRow {
  const row = document.createElement('article')
  row.className = `msg msg--${role}`

  const bubble = document.createElement('div')
  bubble.className = 'msg-bubble'

  row.append(bubble)
  return { bubble, row }
}

function renderMessageContents(
  bubble: HTMLDivElement,
  message: ChatMessageInstance,
): void {
  const blocks = materializeTemplateBlocks(message)
  const fragment = document.createDocumentFragment()
  for (let i = 0; i < blocks.length; i++) {
    fragment.append(renderBlock(blocks[i]!, message.frame.contentInsetX))
  }
  bubble.replaceChildren(fragment)
}

function projectMessageNode(
  cachedRow: CachedRow,
  frame: TemplateFrame,
  top: number,
): void {
  cachedRow.row.style.top = `${top}px`
  cachedRow.row.style.height = `${frame.totalHeight}px`
  cachedRow.bubble.style.width = `${frame.frameWidth}px`
  cachedRow.bubble.style.height = `${frame.bubbleHeight}px`
}

function renderBlock(block: BlockLayout, contentInsetX: number): HTMLElement {
  switch (block.kind) {
    case 'inline':
      return renderInlineBlock(block, contentInsetX)
    case 'code':
      return renderCodeBlock(block, contentInsetX)
    case 'rule':
      return renderRuleBlock(block, contentInsetX)
  }
}

function renderInlineBlock(
  block: Extract<BlockLayout, { kind: 'inline' }>,
  contentInsetX: number,
): HTMLElement {
  const wrapper = createBlockShell(block, 'block block--inline', contentInsetX)

  for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex++) {
    const line = block.lines[lineIndex]!
    const row = document.createElement('div')
    row.className = 'line-row'
    row.style.height = `${block.lineHeight}px`
    row.style.left = `${contentInsetX + block.contentLeft}px`
    row.style.top = `${lineIndex * block.lineHeight}px`

    for (let fi = 0; fi < line.fragments.length; fi++) {
      row.append(renderInlineFragment(line.fragments[fi]!))
    }
    wrapper.append(row)
  }

  return wrapper
}

function renderCodeBlock(
  block: Extract<BlockLayout, { kind: 'code' }>,
  contentInsetX: number,
): HTMLElement {
  const wrapper = createBlockShell(block, 'block block--code-shell', contentInsetX)

  const codeBox = document.createElement('div')
  codeBox.className = 'code-box'
  codeBox.style.left = `${contentInsetX + block.contentLeft}px`
  codeBox.style.width = `${block.width}px`
  codeBox.style.height = `${block.height}px`

  for (let lineIndex = 0; lineIndex < block.lines.length; lineIndex++) {
    const line = block.lines[lineIndex]!
    const row = document.createElement('div')
    row.className = 'code-line'
    row.style.left = `${CODE_BLOCK_PADDING_X}px`
    row.style.top = `${CODE_BLOCK_PADDING_Y + lineIndex * CODE_LINE_HEIGHT}px`
    row.textContent = line.text
    codeBox.append(row)
  }

  wrapper.append(codeBox)
  return wrapper
}

function renderRuleBlock(
  block: Extract<BlockLayout, { kind: 'rule' }>,
  contentInsetX: number,
): HTMLElement {
  const wrapper = createBlockShell(block, 'block block--rule-shell', contentInsetX)
  const rule = document.createElement('div')
  rule.className = 'rule-line'
  rule.style.left = `${contentInsetX + block.contentLeft}px`
  rule.style.top = `${Math.floor(block.height / 2)}px`
  rule.style.width = `${block.width}px`
  wrapper.append(rule)
  return wrapper
}

function createBlockShell(
  block: BlockLayout,
  className: string,
  _contentInsetX: number,
): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.className = className
  wrapper.style.top = `${block.top}px`
  wrapper.style.height = `${block.height}px`

  appendRails(wrapper, block, _contentInsetX)
  appendMarker(wrapper, block, _contentInsetX)
  return wrapper
}

function appendRails(wrapper: HTMLDivElement, block: BlockLayout, contentInsetX: number): void {
  for (let i = 0; i < block.quoteRailLefts.length; i++) {
    const rail = document.createElement('div')
    rail.className = 'quote-rail'
    rail.style.left = `${contentInsetX + block.quoteRailLefts[i]!}px`
    wrapper.append(rail)
  }
}

function appendMarker(
  wrapper: HTMLDivElement,
  block: BlockLayout,
  contentInsetX: number,
): void {
  if (block.markerText === null || block.markerLeft === null || block.markerClassName === null) return

  const marker = document.createElement('span')
  marker.className = block.markerClassName
  marker.style.left = `${contentInsetX + block.markerLeft}px`
  marker.style.top = `${markerTop(block)}px`
  marker.textContent = block.markerText
  wrapper.append(marker)
}

function markerTop(block: BlockLayout): number {
  switch (block.kind) {
    case 'code': return CODE_BLOCK_PADDING_Y
    case 'inline': return Math.max(0, Math.round((block.lineHeight - 12) / 2))
    case 'rule': return 0
  }
}

function renderInlineFragment(fragment: InlineFragmentLayout): HTMLElement {
  const node = fragment.href === null
    ? document.createElement('span')
    : document.createElement('a')

  node.className = fragment.className
  if (fragment.leadingGap > 0) {
    node.style.marginLeft = `${fragment.leadingGap}px`
  }
  node.textContent = fragment.text

  if (node instanceof HTMLAnchorElement && fragment.href !== null) {
    node.href = fragment.href
    node.target = '_blank'
    node.rel = 'noreferrer'
  }

  return node
}
