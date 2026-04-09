import type { MessageCount, Scenario } from './types'

export interface ControlPanelCallbacks {
  onCountChange: (count: MessageCount) => void
  onScenarioChange: (scenario: Scenario) => void
  onBenchmarkStart: () => void
}

export interface ControlPanelElements {
  container: HTMLDivElement
  countSelect: HTMLSelectElement
  scenarioSelect: HTMLSelectElement
  startButton: HTMLButtonElement
  fpsDisplay: HTMLSpanElement
  domDisplay: HTMLSpanElement
  memoryDisplay: HTMLSpanElement
  mountDisplay: HTMLSpanElement
}

export function createControlPanel(callbacks: ControlPanelCallbacks): ControlPanelElements {
  const container = document.createElement('div')
  container.className = 'control-panel'

  // Count selector
  const countSelect = document.createElement('select')
  for (const val of [1000, 5000, 10000]) {
    const opt = document.createElement('option')
    opt.value = String(val)
    opt.textContent = `${val.toLocaleString()} messages`
    countSelect.appendChild(opt)
  }
  countSelect.addEventListener('change', () => {
    callbacks.onCountChange(Number(countSelect.value) as MessageCount)
  })

  // Scenario selector
  const scenarioSelect = document.createElement('select')
  for (const [val, label] of [['fixed', '고정 데이터셋'], ['infinite', '무한 스크롤']] as const) {
    const opt = document.createElement('option')
    opt.value = val
    opt.textContent = label
    scenarioSelect.appendChild(opt)
  }
  scenarioSelect.addEventListener('change', () => {
    callbacks.onScenarioChange(scenarioSelect.value as Scenario)
  })

  // Start button
  const startButton = document.createElement('button')
  startButton.textContent = '▶ 벤치마크 시작'
  startButton.addEventListener('click', callbacks.onBenchmarkStart)

  // Metrics display
  const metricsDiv = document.createElement('div')
  metricsDiv.className = 'metrics'
  const fpsDisplay = createMetricSpan('Mount', '—')
  const domDisplay = createMetricSpan('DOM', '—')
  const memoryDisplay = createMetricSpan('Resize', '—')
  const mountDisplay = createMetricSpan('', '')
  metricsDiv.append(fpsDisplay.wrapper, domDisplay.wrapper, memoryDisplay.wrapper)

  // Home link
  const homeLink = document.createElement('a')
  homeLink.href = import.meta.env.BASE_URL
  homeLink.textContent = '← Home'
  homeLink.style.cssText = 'color:#4a9c5e;text-decoration:none;font-size:13px;font-weight:500;margin-right:4px'

  container.append(homeLink, countSelect, scenarioSelect, startButton, metricsDiv)

  return {
    container,
    countSelect,
    scenarioSelect,
    startButton,
    fpsDisplay: fpsDisplay.value,
    domDisplay: domDisplay.value,
    memoryDisplay: memoryDisplay.value,
    mountDisplay: mountDisplay.value,
  }
}

function createMetricSpan(label: string, initial: string) {
  const wrapper = document.createElement('span')
  const value = document.createElement('span')
  value.className = 'metric-value'
  value.textContent = initial
  wrapper.textContent = `${label}: `
  wrapper.appendChild(value)
  return { wrapper, value }
}

export function updateMetrics(
  els: ControlPanelElements,
  mountMs: number,
  domNodes: number,
  resizeMs: number,
): void {
  els.fpsDisplay.textContent = `${mountMs.toFixed(1)}ms`
  els.domDisplay.textContent = domNodes.toLocaleString()
  els.memoryDisplay.textContent = `${resizeMs.toFixed(1)}ms`
  els.mountDisplay.textContent = ''
}

export function showStatus(message: string): void {
  let el = document.querySelector('.bench-status') as HTMLDivElement | null
  if (!el) {
    el = document.createElement('div')
    el.className = 'bench-status'
    document.body.appendChild(el)
  }
  el.textContent = message
  el.classList.add('visible')
  setTimeout(() => el!.classList.remove('visible'), 3000)
}
