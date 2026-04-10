# Infinite Scroll에서 강제 레이아웃(Forced Layout) 제거

## 문제

Infinite scroll 판단 시 `render()` 호출 직후 DOM 속성(`scrollTop`, `clientHeight`, `scrollHeight`)을 읽으면
브라우저가 방금 변경된 DOM의 레이아웃을 **동기적으로 재계산**해야 한다.
이를 forced layout(또는 layout thrashing)이라 한다.

```
render()          // DOM 쓰기 (canvas 높이, 노드 추가/제거)
el.scrollHeight   // DOM 읽기 → 브라우저가 레이아웃 강제 수행
```

Chrome DevTools Performance 탭에서 보라색 "Layout" 블록이 스크롤 중 반복적으로 나타나는 원인이 된다.

## 원인: 읽기-쓰기 순서 역전

정상적인 패턴은 **read → write** (한 방향)이다.

```
scrollTop 읽기 → clientHeight 읽기 → DOM 변경 (쓰기)   ✅
```

문제가 되는 패턴은 **write → read** 가 섞이는 것이다.

```
render() (쓰기) → scrollHeight 읽기 → render() (쓰기)  ❌
```

`render()`가 canvas 높이를 변경하고 노드를 추가/제거한 직후,
`scrollHeight`를 읽으면 브라우저는 아직 반영하지 않은 레이아웃을 즉시 계산해야 한다.

## 해결

pretext는 모든 메시지의 높이를 **사전 계산**하므로, DOM에 물어볼 필요가 없다.

| 값 | 변경 전 (DOM 조회) | 변경 후 (산술) |
|---|---|---|
| `scrollTop` | `render()` 후 DOM에서 읽기 | `render()` 전에 미리 읽기 |
| `clientHeight` | `render()` 후 DOM에서 읽기 | `render()` 전에 미리 읽기 |
| `scrollHeight` | `render()` 후 DOM에서 읽기 | `frame.totalHeight` 사용 |

```typescript
// 변경 전 — forced layout 발생
render()
if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) { ... }

// 변경 후 — forced layout 없음
const scrollTop = scrollContainer.scrollTop        // 쓰기 전에 읽기
const viewportHeight = scrollContainer.clientHeight // 쓰기 전에 읽기
render()                                           // DOM 쓰기
if (scrollTop + viewportHeight >= frame!.totalHeight - 100) { ... }  // 순수 산술
```

## 핵심 원칙

1. **DOM 읽기는 쓰기 전에** — read-then-write 순서를 지킨다.
2. **계산된 값이 있으면 DOM에 묻지 않는다** — pretext가 높이를 사전 계산하므로 `scrollHeight` 대신 `frame.totalHeight`를 쓴다.
3. **`requestAnimationFrame` 안에서도 동일** — RAF 콜백 내에서 write→read가 발생하면 그 프레임에서 강제 레이아웃이 일어난다.

## 참고

- [What forces layout/reflow](https://gist.github.com/nicknisi/12a22eb30e4c87ad30f6d42fdb2dca25) — 강제 레이아웃을 유발하는 DOM 속성 목록
- Chrome DevTools → Performance → "Layout" 이벤트로 확인 가능
