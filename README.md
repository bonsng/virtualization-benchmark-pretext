# Virtualization Benchmark

세 가지 가상화 접근법을 동일 조건에서 비교하는 벤치마크 프로젝트.

## Background

### Pretext란?

[Pretext](https://github.com/chenglou/pretext)는 Canvas `measureText()` API를 활용해 **DOM 없이 텍스트의 높이를 사전 계산**하는 레이아웃 엔진이다. 가상 스크롤의 핵심 난제는 "아직 렌더하지 않은 아이템의 높이를 어떻게 아느냐"인데, pretext는 이 문제를 사전 과정(prepare)에서 수학적 계산으로 우회한다.

### 프로젝트 동기

가상 스크롤 라이브러리들은 보통 DOM에 렌더한 뒤 높이를 실측하고, 추정값과의 차이를 보정하는 방식을 취한다. 이 과정에서 **스크롤바 점프**, **레이아웃 시프트** 같은 UX 문제가 발생한다. pretext처럼 DOM 없이 높이를 미리 계산하면 이 문제를 근본적으로 해결할 수 있는데, 실제로 얼마나 차이가 나는지 직접 측정해보고 싶었다.

### 비교 대상 선정

| Mode | 선정 이유 |
|---|---|
| **No Virtualization** | 가상화 없이 전체 DOM을 렌더하는 베이스라인. 성능 하한선을 잡기 위한 기준점 |
| **React Virtual** | `@tanstack/react-virtual`은 가장 널리 쓰이는 React 가상화 라이브러리. DOM 실측 기반의 "일반적인 프로덕션 접근법"을 대표 |
| **Pretext** | DOM-free 사전 계산 방식. 각 방식의 최적 환경에서 비교하기 위해 React 없이 vanilla DOM으로 구현 |

### 측정 지표 선정

| Metric | 선정 이유 |
|---|---|
| **Mount Time** | 초기 렌더 성능. 가상화 유무에 따라 가장 극적인 차이가 나는 지표 |
| **Peak DOM Nodes** | 메모리 효율과 렌더 비용의 직접적 지표. 가상화의 핵심 가치를 수치로 보여줌 |
| **Resize Time** | 뷰포트 변경 시 재계산 비용. 사전 계산 vs DOM 실측의 차이가 드러나는 시점 |

## Modes

| Mode | 설명 | 기술 |
|---|---|---|
| **No Virtualization** | 전체 DOM 렌더링. 성능 하한선 기준 | React |
| **React Virtual** | DOM 실측 기반 가상화 | React + @tanstack/react-virtual |
| **Pretext** | DOM-free 사전 계산 가상화 | Vanilla DOM + @chenglou/pretext |

## Benchmark Results

3 rounds 중앙값 (1,000 messages, fixed dataset)

| Metric | No Virtualization | React Virtual | Pretext |
|---|---|---|---|
| Mount Time | 301.7ms | 59.9ms | **16.4ms** |
| Peak DOM Nodes | 36,176 | 113 | 143 |
| Resize Time | 75ms | 16.5ms | **16.6ms** |

- Pretext는 No Virtualization 대비 **18배** 빠른 마운트
- 가상화 방식은 DOM 노드를 **320배** 적게 사용
- Resize 성능은 가상화 두 방식 모두 ~16.5ms로 거의 동일

### React Virtual vs Pretext — 차이가 나는 지점

두 방식 모두 "가시 영역만 렌더"한다는 점은 동일하지만, **Mount Time에서 3.7배 차이**(59.9ms vs 16.4ms)가 발생한다. 이유는 초기 마운트 과정의 구조적 차이에 있다.

- **React Virtual:** 마운트 시 `estimateSize`로 추정 높이를 설정한 뒤, 가시 영역의 아이템을 실제 DOM에 렌더하고, `measureElement`로 실측한 높이로 보정하는 **추정 → 렌더 → 실측 → 보정** 사이클을 거친다. React의 reconciliation 비용도 여기에 포함된다.
- **Pretext:** `prepareRichInline` 단계에서 Canvas `measureText()`로 모든 아이템의 높이를 **DOM 없이 한 번에 사전 계산**한 뒤, 가시 영역만 vanilla DOM으로 직접 렌더한다. 추정-보정 사이클이 없고, React 오버헤드도 없다.

반면 **Peak DOM Nodes**(113 vs 143)와 **Resize Time**(16.5ms vs 16.6ms)은 거의 동일한데, 이는 둘 다 가시 영역만 렌더하는 가상화의 기본 이점을 동일하게 누리기 때문이다. 차이가 드러나는 건 "높이를 어떻게 아느냐"가 관여하는 **초기 마운트 시점**이다.

## Getting Started

```bash
bun install
bun run dev
```

`http://localhost:5173` 에서 랜딩 페이지 → 각 모드 또는 대시보드로 이동.

## Project Structure

```
src/
  shared/           # 공통 타입, 데이터 생성, 컨트롤 패널, 벤치마크 러너
  no-virtualization/ # React 전체 DOM 렌더링
  react-virtual/    # React + @tanstack/react-virtual
  pretext/          # Vanilla DOM + pretext 사전 계산
  dashboard/        # 벤치마크 결과 비교 대시보드
```

## Tech Stack

- **Runtime / Package Manager:** Bun
- **Build / Dev Server:** Vite (multi-entry)
- **UI:** React 19, Vanilla DOM
- **Virtualization:** @tanstack/react-virtual, @chenglou/pretext
- **Markdown:** marked

## Reference

- [Pretext Markdown Chat Demo](https://chenglou.me/pretext/markdown-chat/) — pretext의 공식 마크다운 채팅 데모. 이 프로젝트의 pretext 모드 구현 참고 대상
