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

### 메시지 시드 (13개)

다국어 마크다운 메시지로 높이 편차와 스크립트 다양성을 극대화.

```ts
const MESSAGE_SEEDS: MessageSeed[] = [
  // 기본
  { role: 'user', markdown: '안녕하세요!' },
  { role: 'assistant', markdown: '# Welcome\n\nThis is a **markdown** demo.' },

  // CJK 혼합 (킨소쿠 처리, 그래핌 분할)
  { role: 'user', markdown: 'React의 `useEffect`는 마운트 시점에 실행됩니다.\n\n詳細は**公式ドキュメント**をご覧ください。' },

  // 아랍어 RTL (구두점 클러스터 병합, bidi)
  { role: 'assistant', markdown: 'مرحباً بالعالم! هذا **نص تجريبي** مع `كود` ورابط [هنا](url).' },

  // 중국어 + 코드 블록
  { role: 'user', markdown: '## 性能比较\n\n```ts\nconst result = layout(prepared, width)\n```\n\n测试结果如下：' },

  // 태국어 (Intl.Segmenter 의존 단어 경계)
  { role: 'assistant', markdown: 'สวัสดีครับ นี่คือข้อความทดสอบสำหรับการวัดความกว้างของข้อความภาษาไทย' },

  // 힌디어 + 영어 혼합 (결합 문자 측정)
  { role: 'user', markdown: 'नमस्ते! **Pretext** एक fast text layout engine है। यह `Canvas` API का उपयोग करता है।' },

  // 이모지 ZWJ 시퀀스
  { role: 'assistant', markdown: '👨‍👩‍👧‍👦 가족 이모지와 🇰🇷 국기, 그리고 👩🏽‍💻 직업 이모지 테스트' },

  // 긴 코드 블록
  { role: 'assistant', markdown: '```python\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    a, b = 0, 1\n    for _ in range(2, n + 1):\n        a, b = b, a + b\n    return b\n```' },

  // 리스트 + 인용 + 혼합 스크립트
  { role: 'user', markdown: '> 「吾輩は猫である」 — 夏目漱石\n\n1. 첫 번째 항목\n2. Second item\n3. البند الثالث' },

  // URL + 테이블
  { role: 'assistant', markdown: '자세한 내용은 https://example.com/docs?q=가상화&lang=ko 를 참고하세요.\n\n---\n\n| 방식 | FPS | 메모리 |\n|---|---|---|\n| No Virt | 15 | 280MB |\n| Virtual | 58 | 45MB |' },

  // 미얀마어 (복잡한 medial 결합)
  { role: 'user', markdown: 'မင်္ဂလာပါ။ ဒီစာသားက **မြန်မာဘာသာ** စမ်းသပ်ချက်ဖြစ်ပါတယ်။' },

  // 짧은 메시지들 (높이 편차용)
  { role: 'user', markdown: 'ㅇㅋ' },
  { role: 'assistant', markdown: '👍' },
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
