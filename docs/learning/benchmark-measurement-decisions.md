# 벤치마크 측정 설계 과정: 무엇을, 어떻게 측정할 것인가

## 어떤 지표를 측정할지 결정하기

### 후보 지표들

| 지표 | 설명 |
|---|---|
| 초기 마운트 시간 | N개 메시지를 처음 렌더하는 데 걸리는 시간 |
| 스크롤 FPS | 스크롤 중 프레임 드롭/jank |
| DOM 노드 수 | 가상화 효과를 직관적으로 보여줌 |
| 메모리 사용량 | 힙 메모리 사용량 |
| 리사이즈 반응 시간 | 폭 변경 시 재계산 + 렌더 속도 |

### 채택한 지표: 마운트 시간 + DOM 노드 + 리사이즈 시간

블로그 비교 데이터 용도로 보면:

- **마운트 시간**: 세 모드의 차이가 가장 극적으로 드러남. "10,000개: No Virt 3초 vs Pretext 50ms" 같은 숫자
- **DOM 노드 수**: 가상화의 핵심을 한 숫자로 설명. 측정도 가장 단순하고 신뢰할 수 있음
- **리사이즈 시간**: pretext의 `buildConversationFrame` 재계산 비용 vs React Virtual의 DOM 재측정 비용을 비교할 수 있는 흥미로운 지표

### 제외한 지표와 이유

**스크롤 FPS — 자체 측정에서 제외, DevTools로 대체:**
- `requestAnimationFrame` 기반 FPS 측정은 idle 프레임이 섞여서 항상 ~60fps로 나옴
- 실제 compositor 스레드 지연을 반영하지 못함
- Chrome DevTools Performance 탭이 프레임별 콜스택, 레이아웃/페인트 비용까지 보여주므로 훨씬 정확
- DevTools 녹화 스크린샷을 블로그에 넣는 게 자체 측정 수치보다 설득력 있음

**메모리 사용량 — 제외:**
- `performance.memory`는 Chrome 전용이고 deprecated 방향
- GC 타이밍에 따라 들쭉날쭉해서 재현성이 낮음
- 세 모드의 메모리 차이는 DOM 노드 수에서 이미 간접적으로 드러남

## "마운트 시간"이란 정확히 언제부터 언제까지인가

### 시작 시점

유저가 메시지 수를 선택하는 시점 = 데이터 생성 + 렌더 트리거 직전의 `performance.now()`.

### 끝 시점 — 세 가지 후보

| 후보 | 의미 | 문제 |
|---|---|---|
| DOM 커밋 완료 | 브라우저 DOM 트리에 노드가 다 들어간 시점 | 화면에 안 보일 수 있음 |
| **Paint 완료** | 픽셀이 실제로 화면에 그려진 시점 | ← 채택 |
| 인터랙션 가능 | paint + 이벤트 바인딩 완료 | 우리 모드는 동기 바인딩이라 paint와 거의 동시 |

**Paint 완료를 채택한 이유:** 유저 관점에서 "렌더 완료"는 화면에 보이는 순간이다. DOM이 준비됐지만 화면에 안 보이면 유저한테는 아직 로딩 중이다.

## 모드별로 paint 완료를 어떻게 잡는가

세 모드의 렌더링 메커니즘이 근본적으로 다르므로 paint 완료 감지도 다르게 처리해야 한다.

### React 모드 (No Virt, React Virtual)

React의 렌더 파이프라인:
```
setState → render → DOM commit → paint → useEffect → ...
```

**`useLayoutEffect`는 안 되는 이유:**
- DOM 커밋 후 paint 전에 실행되므로 paint 시간을 포함하지 못함
- 또한 paint를 블록하므로 측정 자체가 렌더 성능에 영향을 줌

**`useEffect`만으로도 안 되는 이유:**
- paint 이후에 실행되지만 정확한 paint 완료 시점이 아니라 "paint 이후 어느 시점"

**채택한 패턴: `useEffect` → `requestAnimationFrame`:**
```ts
useEffect(() => {
  requestAnimationFrame(() => {
    const mountTime = performance.now() - start
  })
}, [messages])
```
이 시점이 "React DOM 커밋 + paint 완료 후, 다음 프레임 직전"이므로 유저가 화면을 보는 시점에 가장 가까움.

### Pretext 모드 (Vanilla)

`reload()`가 동기로 DOM 조작을 완료하므로 단순:
```ts
const start = performance.now()
reload()  // 동기
doubleRaf().then(() => {
  const mountTime = performance.now() - start
})
```

`doubleRaf` = `rAF` → `rAF`. 첫 rAF은 레이아웃 계산, 두 번째 rAF 시점에 paint 완료.

### 왜 공정한 비교인가

두 패턴 모두 "paint 직후 다음 프레임 직전"을 잡는다:
- React: `useEffect`(paint 후) → `rAF`(다음 프레임 직전)
- Pretext: 동기 완료 → `rAF` → `rAF`(다음 프레임 직전)

## 자동 벤치마크 실행 설계

### 왜 자동 실행인가

블로그 데이터는 재현 가능해야 한다. 수동 조작이 개입하면 매번 결과가 달라진다.

### 3회 반복 + 중앙값

1회 실행은 GC, 백그라운드 탭 등의 노이즈에 취약하다. 3회 반복 후 중앙값을 취하면 outlier를 걸러낼 수 있고, 5회보다 시간이 합리적이다.

### 스크롤 속도: viewport 5%/frame

초기 설계에서는 2px/frame을 고려했으나, 10,000개 메시지(총 높이 ~50만px) 기준으로 약 70분이 걸려 비현실적이었다. Viewport의 5%(약 30~40px/frame)로 하면 수 분 내 완료되면서도 매 프레임 렌더를 트리거하므로 DOM 노드 수 측정에 충분하다.

### DOM 노드 카운트 범위

`document.querySelectorAll('*').length`는 컨트롤 패널, status 배너 등도 포함한다. `scrollContainer.querySelectorAll('*').length`로 범위를 한정하여 실제 채팅 콘텐츠의 DOM 노드만 카운트한다.

## 기존 측정의 문제점 (왜 재설계가 필요했는가)

1. **FPS가 의미 없었음** — idle 프레임까지 포함해서 항상 ~60fps. 스크롤 중 실제 프레임 드롭을 잡지 못함
2. **자동 벤치마크가 비현실적** — 프레임당 viewport 절반씩 점프. 실제 스크롤 성능이 아니라 "끝까지 도달 속도"를 측정
3. **이중 측정** — main.ts의 `metricsLoop`와 `AutoBenchmark`의 `tick`이 둘 다 돌면서 간섭
4. **DOM 노드 카운트 부정확** — 컨트롤 패널 등이 포함됨
5. **mountTime 측정 부정확** — `requestAnimationFrame` 한 번으로 paint 완료를 보장하지 못함
