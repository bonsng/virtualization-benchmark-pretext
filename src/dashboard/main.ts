import { benchmarkData } from '@shared/benchmark-data'

const results = benchmarkData.map(d => ({ label: d.label, ...d.result }))
const colors = benchmarkData.map(d => d.color)

const app = document.getElementById('app')!

app.innerHTML = `
  <div class="dashboard">
    <header class="dashboard-header">
      <a href="/" class="back-link">&larr; 돌아가기</a>
      <h1>Benchmark Dashboard</h1>
      <p class="subtitle">3 rounds 평균 · ${new Date().toLocaleDateString('ko-KR')}</p>
    </header>

    <section class="summary-cards">
      ${results.map((r, i) => `
        <div class="summary-card" style="border-top: 3px solid ${colors[i]}">
          <h3>${r.label}</h3>
          <div class="stat"><span class="stat-value">${r.mountTime}ms</span><span class="stat-label">Mount</span></div>
          <div class="stat"><span class="stat-value">${r.peakDomNodes.toLocaleString()}</span><span class="stat-label">Peak DOM</span></div>
          <div class="stat"><span class="stat-value">${r.resizeTime}ms</span><span class="stat-label">Resize</span></div>
        </div>
      `).join('')}
    </section>

    <section class="charts">
      <div class="chart-card">
        <h2>Mount Time (ms)</h2>
        <p class="chart-desc">초기 마운트에 걸리는 시간 — 낮을수록 좋음</p>
        <div class="bar-chart">${barChart(results.map(r => r.mountTime), results.map(r => r.label))}</div>
      </div>
      <div class="chart-card">
        <h2>Peak DOM Nodes</h2>
        <p class="chart-desc">최대 DOM 노드 수 — 낮을수록 메모리 효율적</p>
        <div class="bar-chart">${barChart(results.map(r => r.peakDomNodes), results.map(r => r.label))}</div>
      </div>
      <div class="chart-card">
        <h2>Resize Time (ms)</h2>
        <p class="chart-desc">뷰포트 리사이즈 반응 시간 — 낮을수록 좋음</p>
        <div class="bar-chart">${barChart(results.map(r => r.resizeTime), results.map(r => r.label))}</div>
      </div>
    </section>

    <section class="insight-card">
      <h2>분석</h2>
      <ul>
        <li><strong>Mount Time:</strong> Pretext가 No Virtualization 대비 <strong>${(results[0].mountTime / results[2].mountTime).toFixed(0)}배</strong> 빠름. React Virtual 대비 <strong>${(results[1].mountTime / results[2].mountTime).toFixed(1)}배</strong> 빠름.</li>
        <li><strong>DOM Nodes:</strong> No Virtualization은 <strong>${results[0].peakDomNodes.toLocaleString()}개</strong>의 DOM 노드를 생성하지만, 가상화 방식은 약 <strong>${results[1].peakDomNodes}~${results[2].peakDomNodes}개</strong>로 <strong>${(results[0].peakDomNodes / results[1].peakDomNodes).toFixed(0)}배</strong> 적음.</li>
        <li><strong>Resize:</strong> 가상화 두 방식 모두 ~16.5ms로 거의 동일. No Virtualization은 <strong>${(results[0].resizeTime / results[1].resizeTime).toFixed(1)}배</strong> 느림.</li>
      </ul>
    </section>
  </div>
`

function barChart(values: number[], labels: string[]): string {
  const max = Math.max(...values)
  return values.map((v, i) => {
    const pct = (v / max) * 100
    const formatted = v >= 1000 ? v.toLocaleString() : v.toString()
    return `
      <div class="bar-row">
        <span class="bar-label">${labels[i]}</span>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct}%;background:${colors[i]}"></div>
        </div>
        <span class="bar-value">${formatted}</span>
      </div>
    `
  }).join('')
}
