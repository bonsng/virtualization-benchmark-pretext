import { Marked } from 'marked'
import type { MessageSeed, MessageData } from './types'

const marked = new Marked()

export const MESSAGE_SEEDS: MessageSeed[] = [
  // --- 기본 ---
  { role: 'user', markdown: '안녕하세요!' },
  { role: 'assistant', markdown: '# Welcome\n\nThis is a **markdown** demo.' },

  // --- CJK 혼합 (킨소쿠, 그래핌 분할) ---
  { role: 'user', markdown: 'React의 `useEffect`는 마운트 시점에 실행됩니다.\n\n詳細は**公式ドキュメント**をご覧ください。' },

  // --- 아랍어 RTL (bidi) ---
  { role: 'assistant', markdown: 'مرحباً بالعالم! هذا **نص تجريبي** مع `كود` ورابط [هنا](url).' },

  // --- 중국어 + 코드 블록 ---
  { role: 'user', markdown: '## 性能比较\n\n```ts\nconst result = layout(prepared, width)\n```\n\n测试结果如下：' },

  // --- 태국어 (Intl.Segmenter 의존) ---
  { role: 'assistant', markdown: 'สวัสดีครับ นี่คือข้อความทดสอบสำหรับการวัดความกว้างของข้อความภาษาไทย' },

  // --- 힌디어 + 영어 혼합 ---
  { role: 'user', markdown: 'नमस्ते! **Pretext** एक fast text layout engine है। यह `Canvas` API का उपयोग करता है।' },

  // --- 이모지 ZWJ 시퀀스 ---
  { role: 'assistant', markdown: '👨‍👩‍👧‍👦 가족 이모지와 🇰🇷 국기, 그리고 👩🏽‍💻 직업 이모지 테스트' },

  // --- 긴 코드 블록 (Python) ---
  { role: 'assistant', markdown: '```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n```' },

  // --- 리스트 + 인용 + 혼합 스크립트 ---
  { role: 'user', markdown: '> 「吾輩は猫である」 — 夏目漱石\n\n1. 첫 번째 항목\n2. Second item\n3. البند الثالث' },

  // --- URL + 테이블 ---
  { role: 'assistant', markdown: '자세한 내용은 https://example.com/docs?q=가상화&lang=ko 를 참고하세요.\n\n---\n\n| 방식 | FPS | 메모리 |\n|---|---|---|\n| No Virt | 15 | 280MB |\n| Virtual | 58 | 45MB |' },

  // --- 미얀마어 (복잡한 medial 결합) ---
  { role: 'user', markdown: 'မင်္ဂလာပါ။ ဒီစာသားက **မြန်မာဘာသာ** စမ်းသပ်ချက်ဖြစ်ပါတယ်။' },

  // --- 극단적 짧은 메시지 ---
  { role: 'user', markdown: 'ㅇㅋ' },
  { role: 'assistant', markdown: '👍' },

  // --- 러시아어 + 볼드/이탤릭 혼합 ---
  { role: 'user', markdown: 'Привет! Как настроить **виртуализацию** списка? Нужно ли использовать `react-virtual`?' },

  // --- 베트남어 + 링크 ---
  { role: 'assistant', markdown: 'Xin chào! Đây là hướng dẫn sử dụng [pretext](https://github.com/chenglou/pretext) để đo **chiều cao văn bản** mà không cần DOM.' },

  // --- 인도네시아어 + 중첩 리스트 ---
  { role: 'user', markdown: 'Langkah-langkah setup:\n\n1. Install dependencies\n   - `bun install`\n   - Pastikan Node.js >= 18\n2. Jalankan dev server\n   - `bun run dev`\n3. Buka browser di `localhost:5173`' },

  // --- 긴 멀티 패러그래프 (영어) ---
  { role: 'assistant', markdown: 'Virtual scrolling works by only rendering items that are currently visible in the viewport.\n\nThe key challenge is knowing the height of each item **before** it is rendered. Traditional approaches measure after render, which causes layout shifts.\n\nPretext solves this by using Canvas `measureText()` to calculate text dimensions purely through arithmetic — no DOM needed.' },

  // --- 한국어 긴 설명 + 코드 ---
  { role: 'user', markdown: '가상 스크롤의 핵심 원리를 정리해봤어요:\n\n```js\n// 이진 탐색으로 가시 범위 계산\nconst start = binarySearch(cumHeights, scrollTop)\nconst end = binarySearch(cumHeights, scrollTop + viewport)\n```\n\n위 코드에서 `cumHeights`는 누적 높이 배열이고, `scrollTop`은 현재 스크롤 위치입니다.\n\n이 방식의 장점은 O(log n) 시간에 가시 범위를 찾을 수 있다는 점이에요.' },

  // --- 일본어 긴 문단 ---
  { role: 'assistant', markdown: '仮想スクロールの実装において、最も重要なのは各アイテムの高さを正確に把握することです。\n\n`@tanstack/react-virtual`では`estimateSize`で初期推定値を設定し、`measureElement`でDOM実測値に補正します。この補正プロセスがスクロールバーのジャンプの原因となります。\n\n一方、pretextは**DOMを使わずにテキストの高さを事前計算**できるため、スクロールバーが安定します。' },

  // --- 아랍어 긴 RTL ---
  { role: 'user', markdown: '## اختبار الأداء\n\nنقوم بمقارنة ثلاث طرق مختلفة:\n\n1. **بدون افتراضية** — عرض جميع العناصر\n2. **React Virtual** — افتراضية قائمة على DOM\n3. **Pretext** — حساب مسبق بدون DOM\n\nالهدف هو قياس FPS والذاكرة وعدد عقد DOM.' },

  // --- 코드 블록 (TypeScript, 긴) ---
  { role: 'assistant', markdown: '```typescript\ninterface LayoutData {\n  heights: number[]\n  cumulative: number[]\n  totalHeight: number\n}\n\nfunction computeLayout(\n  messages: MessageData[],\n  containerWidth: number\n): LayoutData {\n  const heights = messages.map(msg =>\n    measureMessageHeight(msg, containerWidth)\n  )\n  const cumulative = computeCumulativeHeights(heights)\n  const totalHeight = cumulative.at(-1) ?? 0\n  return { heights, cumulative, totalHeight }\n}\n```' },

  // --- 이모지 집중 ---
  { role: 'user', markdown: '테스트 결과 정리 🎯\n\n✅ No Virt: 예상대로 느림\n⚡ React Virtual: 준수한 성능\n🚀 Pretext: 가장 빠름\n\n📊 자세한 수치는 대시보드를 확인하세요!' },

  // --- 혼합 스크립트 테이블 ---
  { role: 'assistant', markdown: '| 언어 | 스크립트 | 특이사항 |\n|---|---|---|\n| 한국어 | Hangul | 킨소쿠 처리 |\n| 日本語 | CJK | 禁則処理 |\n| العربية | Arabic | RTL + bidi |\n| ไทย | Thai | No spaces |\n| हिन्दी | Devanagari | Conjuncts |\n| မြန်မာ | Myanmar | Medial clusters |' },

  // --- 극단적으로 긴 한 줄 ---
  { role: 'user', markdown: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ가나다라마바사아자차카타파하あいうえおかきくけこアイウエオカキクケコ一二三四五六七八九十' },

  // --- blockquote 중첩 ---
  { role: 'assistant', markdown: '> 가상화의 핵심은 "보이는 것만 렌더한다"입니다.\n>\n> > 하지만 "보이는 것"을 알려면 높이를 알아야 합니다.\n> >\n> > > 높이를 알려면 렌더해야 하는데... 이것이 **치킨-에그 문제**입니다.\n>\n> Pretext는 이 문제를 Canvas `measureText()`로 해결합니다.' },

  // --- 빈 코드 블록 + 짧은 설명 ---
  { role: 'user', markdown: '이 에러가 나요:\n\n```\nTypeError: Cannot read properties of undefined\n```\n\n뭐가 문제일까요?' },

  // --- 수식 느낌 + 혼합 ---
  { role: 'assistant', markdown: '시간 복잡도를 비교하면:\n\n- No Virt: 렌더 O(n), 스크롤 O(1)\n- React Virtual: 렌더 O(k), 높이 측정 O(k), k = 가시 아이템\n- Pretext: prepare O(n), 렌더 O(k), 탐색 O(log n)\n\n여기서 n은 전체 메시지 수, k는 화면에 보이는 메시지 수입니다.\n\n10,000개 기준으로 k ≈ 15~20 정도이므로 가상화의 이점이 극대화됩니다.' },

  // --- 터키어 ---
  { role: 'user', markdown: 'Merhaba! Bu test mesajı **Türkçe** karakterleri içerir: ç, ğ, ı, ö, ş, ü. Sanal kaydırma `performans` testinde kullanılır.' },

  // --- 한국어 캐주얼 대화 ---
  { role: 'user', markdown: 'ㅋㅋㅋ 이거 진짜 빠르다\n그래프 보니까 확실히 차이 나네\npretext 쪽이 압도적이야' },
  { role: 'assistant', markdown: '맞아요! 특히 10,000개에서 차이가 확연합니다.\n\nDOM 노드 수를 보면:\n- No Virt: **~30,000개**\n- React Virtual: **~150개**\n- Pretext: **~120개**\n\n메모리도 비슷한 패턴이에요.' },
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
