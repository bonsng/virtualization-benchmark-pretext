# Virtualization Benchmark Design Spec

## Overview

세 가지 가상화 접근법(가상화 없음, react-virtual, pretext 방식)을 동일 조건에서 비교하는 벤치마크 프로젝트.

**목적:** 학습(가상화 내부 동작 이해) + 실용적 벤치마크(성능 데이터 수집)

**위치:** `/Users/johnk7795/Projects/study/virtualization-benchmark/`

## Architecture

### 프로젝트 구조

단일 Vite 멀티 엔트리 프로젝트. Bun을 런타임/패키지 매니저로 사용.

```
virtualization-benchmark/
  index.html                     # 랜딩: 네 페이지 링크
  vite.config.ts
  package.json
  tsconfig.json
  src/
    shared/
      data.ts                    # 마크다운 메시지 시드 + 생성기
      markdown.ts                # marked 기반 파싱 (세 모드 공용)
      metrics.ts                 # 측정 유틸 (FPS, 메모리, 타이밍 등)
      types.ts                   # 공통 타입 (MessageData, BenchmarkResult 등)
    no-virtualization/
      index.html
      main.tsx                   # React, 전체 DOM 렌더링
    react-virtual/
      index.html
      main.tsx                   # React + @tanstack/react-virtual
    pretext/
      index.html
      main.ts                    # Vanilla, pretext 방식 DOM-free 가상화
      layout.ts                  # pretext 레이아웃 계산 로직
    dashboard/
      index.html
      main.ts                    # 결과 수집 + 비교 차트
    server/                      # 나중에 서버 필요 시 추가
      (index.ts)                 # Bun.serve() 기반
```

### 의존성

| 패키지 | 용도 |
|---|---|
| `vite` | 빌드/데브 서버 |
| `@vitejs/plugin-react` | React HMR, JSX 변환 |
| `react` + `react-dom` | No Virt, React Virtual 페이지 |
| `@tanstack/react-virtual` | 가상화 비교 대상 |
| `@chenglou/pretext` | DOM-free 텍스트 레이아웃 엔진 |
| `marked` | 마크다운 파싱 (세 모드 공용) |

런타임/패키지 매니저: **Bun**
빌드/데브 서버: **Vite** (`bun run dev`)

## Three Modes

### 1. No Virtualization (React)

모든 메시지를 DOM에 렌더링. 성능 하한선 역할.

- `messages.map(msg => <ChatBubble />)`
- `marked`로 파싱한 HTML을 `dangerouslySetInnerHTML`로 렌더
- 무한 스크롤: 하단 도달 시 배열에 추가 → 전체 리렌더

### 2. React Virtual (React + @tanstack/react-virtual)

DOM 실측 기반 가상화. 일반적인 프로덕션 접근법.

- `useVirtualizer`로 가시 영역만 렌더
- `estimateSize`로 초기 추정 → `measureElement`로 DOM 실측 보정
- 추정→실측 보정 과정이 스크롤바 점프의 원인
- `ChatBubble`은 No Virt와 동일 컴포넌트 재사용
- 무한 스크롤: 배열 추가 → virtualizer 자동 처리

### 3. Pretext 방식 (Vanilla DOM)

DOM-free 사전 계산 가상화. 각 방식의 최적 환경에서 비교하기 위해 React 없이 vanilla.

- prepare 단계 (1회): markdown → marked 파싱 → pretext prepare → 높이 사전 계산
- render 루프 (매 프레임): scrollTop → 이진 탐색 → [start, end) → 증분 DOM 패치
- 높이를 DOM 없이 정확히 아는 게 핵심 차이
- 스크롤바 점프 없음, DOM 노드 수 최소
- 무한 스크롤: 새 메시지를 prepare → messages[] 끝에 append → totalHeight 갱신

### 모드 비교 요약

| | DOM 노드 | 높이 계산 | 스크롤바 | 무한 스크롤 복잡도 |
|---|---|---|---|---|
| No Virt | 전체 | 불필요 | 정확 | 낮음 (append) |
| React Virtual | 가시 영역 | DOM 실측+보정 | 점프 가능 | 중간 |
| Pretext | 가시 영역 | 수학 사전계산 | 정확 | 중간 |

## Data

### 메시지 시드 (30개)

다국어 마크다운 메시지로 높이 편차와 스크립트 다양성을 극대화. 1,000개 기준 ~33회 반복.

```ts
const MESSAGE_SEEDS: MessageSeed[] = [
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

  // --- 러시아어 + 볼드/이탤릭 ---
  { role: 'user', markdown: 'Привет! Как настроить **виртуализацию** списка? Нужно ли использовать `react-virtual`?' },

  // --- 베트남어 + 링크 ---
  { role: 'assistant', markdown: 'Xin chào! Đây là hướng dẫn sử dụng [pretext](https://github.com/chenglou/pretext) để đo **chiều cao văn bản** mà không cần DOM.' },

  // --- 인도네시아어 + 중첩 리스트 ---
  { role: 'user', markdown: 'Langkah-langkah setup:\n\n1. Install dependencies\n   - `bun install`\n   - Pastikan Node.js >= 18\n2. Jalankan dev server\n   - `bun run dev`\n3. Buka browser di `localhost:5173`' },

  // --- 긴 멀티 패러그래프 (영어) ---
  { role: 'assistant', markdown: 'Virtual scrolling works by only rendering items that are currently visible in the viewport.\n\nThe key challenge is knowing the height of each item **before** it is rendered. Traditional approaches measure after render, which causes layout shifts.\n\nPretext solves this by using Canvas `measureText()` to calculate text dimensions purely through arithmetic — no DOM needed.' },

  // --- 한국어 긴 설명 + 코드 ---
  { role: 'user', markdown: '가상 스크롤의 핵심 원리를 정리해봤어요:\n\n```js\nconst start = binarySearch(cumHeights, scrollTop)\nconst end = binarySearch(cumHeights, scrollTop + viewport)\n```\n\n위 코드에서 `cumHeights`는 누적 높이 배열이고, `scrollTop`은 현재 스크롤 위치입니다.\n\n이 방식의 장점은 O(log n) 시간에 가시 범위를 찾을 수 있다는 점이에요.' },

  // --- 일본어 긴 문단 ---
  { role: 'assistant', markdown: '仮想スクロールの実装において、最も重要なのは各アイテムの高さを正確に把握することです。\n\n`@tanstack/react-virtual`では`estimateSize`で初期推定値を設定し、`measureElement`でDOM実測値に補正します。この補正プロセスがスクロールバーのジャンプの原因となります。\n\n一方、pretextは**DOMを使わずにテキストの高さを事前計算**できるため、スクロールバーが安定します。' },

  // --- 아랍어 긴 RTL ---
  { role: 'user', markdown: '## اختبار الأداء\n\nنقوم بمقارنة ثلاث طرق مختلفة:\n\n1. **بدون افتراضية** — عرض جميع العناصر\n2. **React Virtual** — افتراضية قائمة على DOM\n3. **Pretext** — حساب مسبق بدون DOM\n\nالهدف هو قياس FPS والذاكرة وعدد عقد DOM.' },

  // --- 긴 TypeScript 코드 블록 ---
  { role: 'assistant', markdown: '```typescript\ninterface LayoutData {\n  heights: number[]\n  cumulative: number[]\n  totalHeight: number\n}\n\nfunction computeLayout(\n  messages: MessageData[],\n  containerWidth: number\n): LayoutData {\n  const heights = messages.map(msg =>\n    measureMessageHeight(msg, containerWidth)\n  )\n  const cumulative = computeCumulativeHeights(heights)\n  const totalHeight = cumulative.at(-1) ?? 0\n  return { heights, cumulative, totalHeight }\n}\n```' },

  // --- 이모지 집중 ---
  { role: 'user', markdown: '테스트 결과 정리 🎯\n\n✅ No Virt: 예상대로 느림\n⚡ React Virtual: 준수한 성능\n🚀 Pretext: 가장 빠름\n\n📊 자세한 수치는 대시보드를 확인하세요!' },

  // --- 혼합 스크립트 테이블 ---
  { role: 'assistant', markdown: '| 언어 | 스크립트 | 특이사항 |\n|---|---|---|\n| 한국어 | Hangul | 킨소쿠 처리 |\n| 日本語 | CJK | 禁則処理 |\n| العربية | Arabic | RTL + bidi |\n| ไทย | Thai | No spaces |\n| हिन्दी | Devanagari | Conjuncts |\n| မြန်မာ | Myanmar | Medial clusters |' },

  // --- 극단적으로 긴 한 줄 ---
  { role: 'user', markdown: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ가나다라마바사아자차카타파하あいうえおかきくけこアイウエオカキクケコ一二三四五六七八九十' },

  // --- blockquote 중첩 ---
  { role: 'assistant', markdown: '> 가상화의 핵심은 "보이는 것만 렌더한다"입니다.\n>\n> > 하지만 "보이는 것"을 알려면 높이를 알아야 합니다.\n> >\n> > > 높이를 알려면 렌더해야 하는데... 이것이 **치킨-에그 문제**입니다.\n>\n> Pretext는 이 문제를 Canvas `measureText()`로 해결합니다.' },

  // --- 에러 메시지 + 짧은 코드 ---
  { role: 'user', markdown: '이 에러가 나요:\n\n```\nTypeError: Cannot read properties of undefined\n```\n\n뭐가 문제일까요?' },

  // --- 복잡도 분석 ---
  { role: 'assistant', markdown: '시간 복잡도를 비교하면:\n\n- No Virt: 렌더 O(n), 스크롤 O(1)\n- React Virtual: 렌더 O(k), 높이 측정 O(k), k = 가시 아이템\n- Pretext: prepare O(n), 렌더 O(k), 탐색 O(log n)\n\n여기서 n은 전체 메시지 수, k는 화면에 보이는 메시지 수입니다.\n\n10,000개 기준으로 k ≈ 15~20 정도이므로 가상화의 이점이 극대화됩니다.' },

  // --- 터키어 ---
  { role: 'user', markdown: 'Merhaba! Bu test mesajı **Türkçe** karakterleri içerir: ç, ğ, ı, ö, ş, ü. Sanal kaydırma `performans` testinde kullanılır.' },

  // --- 한국어 캐주얼 대화 ---
  { role: 'user', markdown: 'ㅋㅋㅋ 이거 진짜 빠르다\n그래프 보니까 확실히 차이 나네\npretext 쪽이 압도적이야' },
  { role: 'assistant', markdown: '맞아요! 특히 10,000개에서 차이가 확연합니다.\n\nDOM 노드 수를 보면:\n- No Virt: **~30,000개**\n- React Virtual: **~150개**\n- Pretext: **~120개**\n\n메모리도 비슷한 패턴이에요.' },
]
```

### 데이터 생성

```ts
function generateMessages(count: number): MessageData[]
// 시드를 count만큼 반복, id 부여. 세 모드가 동일 데이터 사용.

function loadNextBatch(existing: MessageData[], batchSize = 50): MessageData[]
// 무한 스크롤용: 50개씩 배치 추가, 네트워크 지연 시뮬레이션 옵션
```

메시지 수 선택: **1,000 / 5,000 / 10,000**

## Metrics

### 측정 지표

| 지표 | 측정 방법 | 시점 |
|---|---|---|
| 초기 마운트 시간 | `performance.now()` 시작/끝 차이 | 페이지 로드 시 |
| 스크롤 FPS | `requestAnimationFrame` 콜백 간격 카운트 | 스크롤 중 실시간 |
| 프레임 드롭 | `PerformanceObserver('long-animation-frame')` | 스크롤 중 실시간 |
| DOM 노드 수 | `document.querySelectorAll('*').length` | 매 프레임 or 주기적 |
| 메모리 사용량 | `performance.memory` (Chrome 전용) | 주기적 스냅샷 |
| 리사이즈 반응 시간 | `performance.now()` 리사이즈 이벤트 → 렌더 완료 | 리사이즈 시 |
| 무한 스크롤 삽입 시간 | `performance.now()` 데이터 추가 → 렌더 완료 | 메시지 로드 시 |
| 스크롤바 안정성 | scrollTop 변화 추적 (무한 스크롤 전용) | 무한 스크롤 시 |

### 각 페이지 컨트롤 패널

```
[메시지 수: 1,000 ▾ 5,000 ▾ 10,000]  [모드: 고정 ▾ 무한스크롤]  [▶ 벤치마크 시작]
─────────────────────────────────────────────────────────────────
FPS: 60  |  DOM 노드: 127  |  메모리: 42MB  |  마운트: 23ms
```

### 자동 벤치마크 실행

1. 선택된 메시지 수로 데이터 생성
2. 마운트 시간 측정
3. 자동 스크롤 시작 (`scrollTop += 2` per rAF, 일정 속도)
4. 스크롤 중 FPS / DOM 노드 / 프레임 드롭 수집
5. 끝까지 도달하면 결과를 localStorage에 저장
6. UI에 "저장 완료" 표시

## Data Collection

### 저장 방식

localStorage 기반. 서버 불필요.

```
key: "bench:{mode}:{count}:{scenario}"
  예: "bench:pretext:10000:fixed"
  예: "bench:react-virtual:5000:infinite"

value: {
  timestamp: number,
  mountTime: number,
  avgFps: number,
  minFps: number,
  frameDrops: number,
  peakDomNodes: number,
  memoryPeak: number | null,
  resizeTime: number,
  insertTime: number | null,       // 무한 스크롤 전용
  scrollbarJumps: number | null,   // 무한 스크롤 전용
}
```

### 대시보드

localStorage에서 세 모드의 결과를 읽어서 비교.

**구성:**
- 상단: 메시지 수 / 시나리오 필터
- 중단: CSS 막대 차트 (지표별 세 모드 비교)
  - 색상: No Virt(회색), React Virtual(파랑), Pretext(초록)
  - 별도 차트 라이브러리 없이 div width 비례 + 숫자 라벨
- 하단: 상세 데이터 테이블

**무한 스크롤 전용 섹션:** 메시지 삽입 시간 + 스크롤바 안정성 비교

## Scenarios

### 1. 고정 데이터셋

미리 생성된 N개 메시지로 비교. 메시지 수별 성능 스케일링 관찰.

### 2. 무한 스크롤 시뮬레이션

초기 100개 → 스크롤 하단 도달 시 50개씩 추가. 선택적 200ms 네트워크 지연.
위쪽 삽입은 이 스펙에서는 제외 (향후 확장 가능).

## Future Extensions

- `src/server/index.ts`에 `Bun.serve()` 기반 서버 추가
- 위쪽 메시지 삽입 (채팅 히스토리 로드) 시나리오
- 결과를 서버에 저장/내보내기
- 추가 CSS 모드 비교 (`pre-wrap`, `break-all` 등)
