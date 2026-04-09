# Pretext 레이아웃: prepareRichInline이 필수인 이유

## 문제: plain text prepare로는 높이/폭이 맞지 않는다

초기 구현에서는 마크다운을 plain text로 변환한 뒤 `prepare(plainText, font)` → `layout()`으로 높이를 계산했다. 이 방식은 실제 렌더링과 높이/폭이 불일치하여 스크롤 깨짐, 텍스트 가려짐, 끝없는 스크롤 등의 문제가 발생했다.

**plain text 방식의 흐름:**

```
markdown → flattenInlineTokens() → plain text 한 덩어리
         → prepare(plainText, singleFont)
         → layout()
```

**발생한 문제들:**

- `**bold**`와 일반 텍스트가 같은 폭으로 계산됨 (bold는 실제로 더 넓다)
- `` `code` ``의 배경 패딩(`extraWidth`)이 반영 안 됨
- 모든 fragment를 하나의 폰트로 측정하므로 줄바꿈 위치가 실제와 다름
- 측정(plain text + 단일 폰트)과 렌더(HTML + 다양한 CSS)가 근본적으로 불일치
- 결과: 스크롤이 끝없이 내려가거나, 텍스트가 가려지거나, 버블 크기가 맞지 않음

## 해결: prepareRichInline으로 fragment별 측정

`@chenglou/pretext@0.0.5`에서 `@chenglou/pretext/rich-inline` export가 추가되어 데모와 동일한 방식을 사용할 수 있게 되었다.

```
markdown → marked.lexer() → inline tokens 순회
         → 각 fragment별로 {text, font, extraWidth, breakMode} 생성
         → prepareRichInline(fragments[])
         → measureRichInlineStats() / walkRichInlineLineRanges()
```

- bold는 `700 14px`, code는 `600 12px mono` + `extraWidth: 12`, 일반은 `400 14px`
- **fragment마다 다른 폰트/폭으로 측정**
- `prepareRichInline`이 mixed-font 조각들을 하나의 flow로 합쳐서 정확한 줄바꿈 위치와 줄 폭을 계산
- 렌더링할 때도 fragment 단위로 `<span class="frag--body">`, `<span class="frag--code">` 등을 생성하므로 **측정한 것과 렌더하는 것이 정확히 일치**

## 비교

| | plain text 방식 | prepareRichInline 방식 |
|---|---|---|
| 폰트 | 블록당 1개 | fragment마다 다름 |
| inline code 폭 | 무시 | `extraWidth` 반영 |
| bold 폭 | 무시 | bold 폰트로 측정 |
| 줄바꿈 | 단일 폰트 기준 | mixed-font flow 기준 |
| 측정 ↔ 렌더 | 불일치 | 일치 (같은 fragment 데이터) |

## 3단계 아키텍처 (데모와 동일)

1. **Prepare** (비싼 작업, 시드당 1회): `marked.lexer` → inline tokens → `prepareRichInline` / `prepareWithSegments`로 Canvas measureText 수행
2. **Frame** (빠른 산술, 폭 변경 시): `measureRichInlineStats` / `measureLineStats`로 lineCount + maxLineWidth만 계산 → 전체 메시지의 top/bottom/frameWidth 결정
3. **Materialize** (가시 아이템만): `walkRichInlineLineRanges` + `materializeRichInlineLineRange`로 실제 줄 텍스트와 fragment 추출 → DOM 생성

이 구조에서 Stage 1은 시드 수(~30개)에 비례하고, Stage 2는 빠른 산술이라 10,000개도 순식간이며, Stage 3는 화면에 보이는 ~15-20개만 처리한다.

## 구현 참고

현재 `src/pretext/chat-model.ts`는 `@chenglou/pretext` 패키지의 `pages/demos/markdown-chat.model.ts`를 import 경로만 수정하여 사용한다. 이 파일이 위 3단계 로직을 전부 포함한다.
