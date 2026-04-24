const rp = (n) => 'Rp ' + (Math.round(n*100)/100).toLocaleString('id-ID');
const num = (n, d=2) => (Math.round(n * Math.pow(10,d)) / Math.pow(10,d)).toLocaleString('id-ID');
const parseList = (str) => str.split(/[,\n\s]+/).map(x => parseFloat(x)).filter(x => !isNaN(x));
const val = (id) => parseFloat(document.getElementById(id).value);

let fcChart, bepChart, stChart; // Global variables to store chart instances

function resultItem(label, value, primary=false) {
  return `<div class="result-item"><div class="label">${label}</div><div class="value${primary?' primary':''}">${value}</div></div>`;
}

function resetCalc(prefix) {
  if (prefix === 'st') {
    initStatTable();
  } else {
    document.querySelectorAll(`#calc-${prefix} input, #calc-${prefix} textarea`).forEach(e => e.value = '');
  }
  const r = document.getElementById(prefix + '-result');
  if (r) r.classList.add('hidden');
}

// Navigation
const calcNav = document.getElementById('calcNav');
calcNav.addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') {
    const target = e.target.dataset.target;
    document.querySelectorAll('.calc-nav button').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    document.querySelectorAll('.calc').forEach(c => c.classList.remove('active'));
    document.getElementById('calc-' + target).classList.add('active');
    window.scrollTo({ top: calcNav.offsetTop - 80, behavior: 'smooth' });
  }
});

// Sidebar Links
const sideLinks = document.getElementById('sideLinks');
document.querySelectorAll('.calc-nav button').forEach(b => {
  const li = document.createElement('li');
  li.innerHTML = `<a href="#" data-target="${b.dataset.target}">${b.textContent}</a>`;
  sideLinks.appendChild(li);
});
sideLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    e.preventDefault();
    const btn = document.querySelector(`.calc-nav button[data-target="${e.target.dataset.target}"]`);
    if (btn) btn.click();
  }
});

// Calculators
function calcEOQ() {
  const D = val('eoq-d'), S = val('eoq-s'), H = val('eoq-h'), days = val('eoq-days') || 300;
  if (!(D > 0 && S > 0 && H > 0)) return alert('Masukkan nilai D, S, dan H yang valid (> 0).');
  const EOQ = Math.sqrt((2 * D * S) / H);
  const N = D / EOQ;
  const T = days / N;
  const TC = (D/EOQ)*S + (EOQ/2)*H;
  document.getElementById('eoq-result-grid').innerHTML =
    resultItem('EOQ (Q*)', num(EOQ,2) + ' unit', true)
  + resultItem('Jumlah Pemesanan/thn', num(N,2) + ' kali')
  + resultItem('Siklus Pemesanan', num(T,2) + ' hari')
  + resultItem('Total Biaya Persediaan', rp(TC));
  document.getElementById('eoq-detail').innerHTML =
    `<strong>Formula:</strong> EOQ = √(2·D·S/H) = √(2×${num(D)}×${num(S)}/${num(H)}) = <strong>${num(EOQ,2)}</strong> unit<br>
     <strong>TC:</strong> (D/Q)·S + (Q/2)·H = ${rp((D/EOQ)*S)} + ${rp((EOQ/2)*H)} = <strong>${rp(TC)}</strong>`;
  document.getElementById('eoq-result').classList.remove('hidden');
}

function calcROP() {
  const d = val('rop-d'), L = val('rop-l'), ss = val('rop-ss') || 0;
  if (!(d > 0 && L > 0)) return alert('Masukkan d dan L yang valid.');
  const ROP = d * L + ss;
  document.getElementById('rop-result-grid').innerHTML =
    resultItem('Reorder Point', num(ROP,2) + ' unit', true)
  + resultItem('Permintaan Lead Time', num(d*L,2) + ' unit')
  + resultItem('Safety Stock', num(ss,2) + ' unit');
  document.getElementById('rop-detail').innerHTML =
    `<strong>ROP = d × L + SS</strong> = ${num(d)} × ${num(L)} + ${num(ss)} = <strong>${num(ROP,2)} unit</strong><br>Pesan kembali saat stok mencapai ${num(ROP,2)} unit.`;
  document.getElementById('rop-result').classList.remove('hidden');
}

function calcSS() {
  const Z = parseFloat(document.getElementById('ss-service').value);
  const sigma = val('ss-sigma'), L = val('ss-l');
  if (!(sigma > 0 && L > 0)) return alert('Masukkan σd dan L yang valid.');
  const SS = Z * sigma * Math.sqrt(L);
  const sl = document.getElementById('ss-service').options[document.getElementById('ss-service').selectedIndex].text;
  document.getElementById('ss-result-grid').innerHTML =
    resultItem('Safety Stock', num(SS,2) + ' unit', true)
  + resultItem('Z-score', Z) + resultItem('Service Level', sl);
  document.getElementById('ss-detail').innerHTML =
    `<strong>SS = Z × σd × √L</strong> = ${Z} × ${num(sigma)} × √${num(L)} = <strong>${num(SS,2)} unit</strong>`;
  document.getElementById('ss-result').classList.remove('hidden');
}

function calcForecast() {
  const method = document.getElementById('fc-method').value;
  const param = document.getElementById('fc-param').value;
  const data = parseList(document.getElementById('fc-data').value);
  if (data.length < 2) return alert('Masukkan minimal 2 data.');
  let forecasts = [];
  if (method === 'ma') {
    const n = parseInt(param);
    if (!(n >= 1 && n <= data.length)) return alert('n harus antara 1 dan jumlah data.');
    for (let i = n; i < data.length; i++) {
      const f = data.slice(i - n, i).reduce((a,b) => a+b, 0) / n;
      forecasts.push({ t: i+1, actual: data[i], forecast: f, err: data[i]-f });
    }
    const next = data.slice(-n).reduce((a,b) => a+b, 0) / n;
    forecasts.push({ t: data.length+1, actual: null, forecast: next, err: null });
  } else if (method === 'wma') {
    const weights = parseList(document.getElementById('fc-weights').value);
    const sumW = weights.reduce((a,b)=>a+b,0);
    if (Math.abs(sumW - 1) > 0.01) return alert('Jumlah bobot harus = 1. Sekarang = ' + sumW);
    const n = weights.length;
    for (let i = n; i < data.length; i++) {
      let f = 0;
      for (let j = 0; j < n; j++) f += weights[j] * data[i-1-j];
      forecasts.push({ t: i+1, actual: data[i], forecast: f, err: data[i]-f });
    }
    let fnext = 0;
    for (let j = 0; j < n; j++) fnext += weights[j] * data[data.length-1-j];
    forecasts.push({ t: data.length+1, actual: null, forecast: fnext, err: null });
  } else if (method === 'es') {
    const alpha = parseFloat(param);
    if (!(alpha > 0 && alpha <= 1)) return alert('α harus antara 0 dan 1.');
    let F = data[0];
    forecasts.push({ t: 1, actual: data[0], forecast: F, err: 0 });
    for (let i = 1; i < data.length; i++) {
      F = F + alpha * (data[i-1] - F);
      forecasts.push({ t: i+1, actual: data[i], forecast: F, err: data[i] - F });
    }
    const Fnext = F + alpha * (data[data.length-1] - F);
    forecasts.push({ t: data.length+1, actual: null, forecast: Fnext, err: null });
  }
  const valid = forecasts.filter(f => f.actual !== null && f.err !== null);
  const MAD = valid.reduce((a,b) => a+Math.abs(b.err), 0) / valid.length;
  const MSE = valid.reduce((a,b) => a+b.err*b.err, 0) / valid.length;
  const MAPE = valid.reduce((a,b) => a+Math.abs(b.err/b.actual), 0) / valid.length * 100;
  const nextF = forecasts[forecasts.length-1].forecast;
  document.getElementById('fc-result-grid').innerHTML =
    resultItem('Forecast Berikutnya', num(nextF,2), true)
  + resultItem('MAD', num(MAD,2)) + resultItem('MSE', num(MSE,2)) + resultItem('MAPE', num(MAPE,2) + '%');
  let html = '<table class="data-table"><tr><th>Periode</th><th>Aktual</th><th>Forecast</th><th>Error</th></tr>';
  forecasts.forEach(f => { html += `<tr><td>${f.t}</td><td>${f.actual===null?'-':num(f.actual,2)}</td><td>${num(f.forecast,2)}</td><td>${f.err===null?'-':num(f.err,2)}</td></tr>`; });
  html += '</table>';
  document.getElementById('fc-table').innerHTML = html;
  document.getElementById('fc-result').classList.remove('hidden');

  // Render Chart
  const labels = forecasts.map(f => 'Periode ' + f.t);
  const actualValues = forecasts.map(f => f.actual);
  const forecastValues = forecasts.map(f => f.forecast);
  
  const ctx = document.getElementById('fc-chart').getContext('2d');
  if (fcChart) fcChart.destroy(); // Destroy previous chart to prevent overlapping
  
  fcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Data Aktual',
          data: actualValues,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          tension: 0.3,
          pointRadius: 4
        },
        {
          label: 'Hasil Forecast',
          data: forecastValues,
          borderColor: '#dc2626',
          borderDash: [5, 5],
          tension: 0.3,
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      }
    }
  });
}

function calcBEP() {
  const FC = val('bep-fc'), P = val('bep-p'), VC = val('bep-vc'), profit = val('bep-profit') || 0;
  if (!(FC > 0 && P > VC)) return alert('FC harus > 0 dan harga jual harus > biaya variabel.');
  const marg = P - VC;
  const BEP_unit = FC / marg;
  const BEP_rp = BEP_unit * P;
  const targetUnit = (FC + profit) / marg;
  const CMR = (marg/P) * 100;
  document.getElementById('bep-result-grid').innerHTML =
    resultItem('BEP (Unit)', num(BEP_unit,0) + ' unit', true)
  + resultItem('BEP (Rupiah)', rp(BEP_rp))
  + resultItem('Contribution Margin', rp(marg) + ' /unit')
  + resultItem('CM Ratio', num(CMR,2) + '%')
  + (profit > 0 ? resultItem('Unit utk Target Laba', num(targetUnit,0) + ' unit') : '');
  document.getElementById('bep-detail').innerHTML =
    `<strong>BEP Unit = FC/(P−VC)</strong> = ${rp(FC)}/(${rp(P)}−${rp(VC)}) = <strong>${num(BEP_unit,0)} unit</strong>`;
  document.getElementById('bep-result').classList.remove('hidden');

  // Render BEP Chart
  const ctx = document.getElementById('bep-chart').getContext('2d');
  if (bepChart) bepChart.destroy();

  const range = Math.ceil(BEP_unit * 2) || 100;
  const labels = [0, Math.round(BEP_unit), range];
  
  bepChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Revenue',
          data: labels.map(q => q * P),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true
        },
        {
          label: 'Total Cost',
          data: labels.map(q => FC + (VC * q)),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        y: { 
          ticks: { callback: (v) => 'Rp ' + v.toLocaleString('id-ID') },
          title: { display: true, text: 'Rupiah' }
        },
        x: { title: { display: true, text: 'Quantity (Unit)' } }
      },
      plugins: {
        title: { display: true, text: 'Grafik Break-Even Point' },
        tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + rp(ctx.raw) } }
      }
    }
  });
}

function calcTakt() {
  const T = val('takt-time'), D = val('takt-demand'), CT = val('takt-ct') || 0;
  if (!(T > 0 && D > 0)) return alert('Masukkan waktu & permintaan yang valid.');
  const takt = T / D;
  const gap = CT > 0 ? (CT - takt) : null;
  document.getElementById('takt-result-grid').innerHTML =
    resultItem('Takt Time', num(takt,2) + ' menit/unit', true)
  + resultItem('Takt Time', num(takt*60,2) + ' detik/unit')
  + (CT > 0 ? resultItem('Cycle Time Aktual', num(CT,2) + ' menit/unit') : '')
  + (CT > 0 ? resultItem('Gap (CT − Takt)', num(gap,2) + ' menit') : '');
  let status = '';
  if (CT > 0) {
    if (CT > takt) status = `<strong style="color:#dc2626">CT > Takt:</strong> produksi tidak memenuhi permintaan.`;
    else if (CT < takt) status = `<strong style="color:#10b981">CT < Takt:</strong> kapasitas berlebih / idle.`;
    else status = `<strong>CT = Takt:</strong> lini seimbang.`;
  }
  document.getElementById('takt-detail').innerHTML =
    `<strong>Takt = ${num(T)}/${num(D)} = ${num(takt,2)} menit/unit</strong><br>${status}`;
  document.getElementById('takt-result').classList.remove('hidden');
}

function calcOEE() {
  const planned = val('oee-planned'), downtime = val('oee-downtime');
  const ict = val('oee-ict'), total = val('oee-total'), good = val('oee-good');
  if (!(planned > 0 && ict > 0 && total >= 0)) return alert('Lengkapi input OEE.');
  const runtime = planned - downtime;
  const A = runtime / planned;
  const P = (ict * total) / runtime;
  const Q = good / total;
  const OEE = A * P * Q;
  const pct = (x) => num(x*100, 2) + '%';
  let rating = OEE >= 0.85 ? 'World Class' : OEE >= 0.60 ? 'Industry Average' : 'Perlu Perbaikan';
  document.getElementById('oee-result-grid').innerHTML =
    resultItem('OEE', pct(OEE), true)
  + resultItem('Availability', pct(A))
  + resultItem('Performance', pct(P))
  + resultItem('Quality', pct(Q))
  + resultItem('Run Time', num(runtime) + ' menit')
  + resultItem('Rating', rating);
  document.getElementById('oee-detail').innerHTML =
    `<strong>A</strong> = ${num(runtime)}/${num(planned)} = ${pct(A)} | <strong>P</strong> = (${num(ict)}×${num(total)})/${num(runtime)} = ${pct(P)} | <strong>Q</strong> = ${num(good)}/${num(total)} = ${pct(Q)}<br><strong>OEE = ${pct(OEE)}</strong> (${rating})`;
  document.getElementById('oee-result').classList.remove('hidden');
}

function calcLineBal() {
  const CT = val('lb-ct'), N = val('lb-n');
  const tasks = parseList(document.getElementById('lb-tasks').value);
  if (!(CT > 0 && N > 0 && tasks.length > 0)) return alert('Lengkapi input.');
  const sumT = tasks.reduce((a,b)=>a+b, 0);
  const Nmin = Math.ceil(sumT / CT);
  const eff = (sumT / (N * CT)) * 100;
  const balDelay = 100 - eff;
  const maxT = Math.max(...tasks);
  const smoothness = Math.sqrt(tasks.reduce((a,b)=> a + Math.pow(maxT-b, 2), 0));
  document.getElementById('lb-result-grid').innerHTML =
    resultItem('N Minimum', Nmin, true)
  + resultItem('Efisiensi', num(eff,2) + '%')
  + resultItem('Balance Delay', num(balDelay,2) + '%')
  + resultItem('ΣTi', num(sumT,2) + ' detik')
  + resultItem('Task Terlama', num(maxT,2) + ' detik')
  + resultItem('Smoothness Index', num(smoothness,2));
  let warning = maxT > CT ? `<br><strong style="color:#dc2626">Peringatan:</strong> task ${num(maxT)}s melebihi CT ${num(CT)}s.` : '';
  document.getElementById('lb-detail').innerHTML =
    `<strong>N* = ⌈${num(sumT)}/${num(CT)}⌉ = ${Nmin}</strong> | <strong>Eff = ${num(eff,2)}%</strong>${warning}`;
  document.getElementById('lb-result').classList.remove('hidden');
}

function calcNPV() {
  const I0 = val('npv-i0'), rate = val('npv-rate') / 100;
  const cf = parseList(document.getElementById('npv-cf').value);
  if (!(I0 >= 0 && cf.length > 0)) return alert('Lengkapi input.');
  let NPV = -I0, cumulative = -I0, payback = null;
  let rows = [['0', rp(-I0), '1.0000', rp(-I0), rp(cumulative)]];
  for (let i = 0; i < cf.length; i++) {
    const t = i+1;
    const df = 1 / Math.pow(1+rate, t);
    const pv = cf[i] * df;
    NPV += pv;
    const prevCum = cumulative;
    cumulative += cf[i];
    if (payback === null && cumulative >= 0) payback = t - 1 + Math.abs(prevCum) / cf[i];
    rows.push([t, rp(cf[i]), df.toFixed(4), rp(pv), rp(cumulative)]);
  }
  document.getElementById('npv-result-grid').innerHTML =
    resultItem('NPV', rp(NPV), true)
  + resultItem('Discount Rate', (rate*100) + '%')
  + resultItem('Keputusan', NPV >= 0 ? 'Layak (NPV≥0)' : 'Tidak Layak')
  + (payback !== null ? resultItem('Payback Period', num(payback,2) + ' tahun') : resultItem('Payback', 'Belum tercapai'));
  let html = '<table class="data-table"><tr><th>Thn</th><th>Cash Flow</th><th>DF</th><th>PV</th><th>Kumulatif</th></tr>';
  rows.forEach(r => html += `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`);
  html += '</table>';
  document.getElementById('npv-table').innerHTML = html;
  document.getElementById('npv-result').classList.remove('hidden');
}

// Statistics Table Management
function addStatRow(val = '') {
  const tbody = document.getElementById('st-tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="row-num" style="text-align: center; color: var(--text-muted); font-weight: 600;"></td>
    <td><input type="number" class="st-input-val" value="${val}" step="any" style="width: 100%; border: none; background: transparent; outline: none; padding: 4px; font-family: inherit;"></td>
    <td style="text-align: center;"><button type="button" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px;" onclick="removeStatRow(this)">Hapus</button></td>
  `;
  tbody.appendChild(tr);
  updateRowNumbers();
}
function removeStatRow(btn) {
  btn.closest('tr').remove();
  updateRowNumbers();
}
function updateRowNumbers() {
  document.querySelectorAll('#st-tbody .row-num').forEach((td, i) => td.textContent = i + 1);
}
function initStatTable() {
  const tbody = document.getElementById('st-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  [12, 14, 13, 15, 12, 16, 14, 13, 15, 14].forEach(v => addStatRow(v));
}

function calcStats() {
  const inputs = document.querySelectorAll('.st-input-val');
  const data = Array.from(inputs).map(i => parseFloat(i.value)).filter(v => !isNaN(v));

  if (data.length < 2) return alert('Minimal 2 data.');
  const n = data.length;
  const mean = data.reduce((a,b)=>a+b,0) / n;
  const sorted = [...data].sort((a,b)=>a-b);
  const median = n % 2 === 0 ? (sorted[n/2-1]+sorted[n/2])/2 : sorted[Math.floor(n/2)];
  const variance = data.reduce((a,b)=> a + Math.pow(b-mean,2), 0) / (n-1);
  const std = Math.sqrt(variance);
  const min = Math.min(...data), max = Math.max(...data);
  const UCL = mean + 3*std, LCL = mean - 3*std;
  document.getElementById('st-result-grid').innerHTML =
    resultItem('Mean (x̄)', num(mean,2), true)
  + resultItem('Median', num(median,2))
  + resultItem('Std Dev (s)', num(std,2))
  + resultItem('Variance', num(variance,2))
  + resultItem('Min / Max', num(min,2) + ' / ' + num(max,2))
  + resultItem('Range', num(max-min,2))
  + resultItem('UCL', num(UCL,2))
  + resultItem('LCL', num(LCL,2));
  const out = data.filter(d => d > UCL || d < LCL);
  document.getElementById('st-detail').innerHTML =
    `<strong>Mean</strong> ${num(mean,2)}, <strong>s</strong> ${num(std,2)} | UCL ${num(UCL,2)}, LCL ${num(LCL,2)}<br><strong>Out-of-control:</strong> ${out.length === 0 ? 'Tidak ada (proses terkendali).' : out.length + ' titik (' + out.join(', ') + ').'}`;
  document.getElementById('st-result').classList.remove('hidden');

  // Render SPC / Control Chart
  const ctx = document.getElementById('st-chart').getContext('2d');
  if (stChart) stChart.destroy();

  stChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i + 1),
      datasets: [
        {
          label: 'Data Aktual',
          data: data,
          borderColor: '#2563eb',
          pointBackgroundColor: data.map(v => (v > UCL || v < LCL) ? '#dc2626' : '#2563eb'),
          pointRadius: 5,
          borderWidth: 2
        },
        {
          label: 'Mean',
          data: Array(n).fill(mean),
          borderColor: '#10b981',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'UCL / LCL (±3σ)',
          data: Array(n).fill(UCL),
          borderColor: '#dc2626',
          borderDash: [10, 5],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'LCL',
          data: Array(n).fill(LCL),
          borderColor: '#dc2626',
          borderDash: [10, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Individual Control Chart (X-Chart)' },
        legend: {
          labels: {
            filter: (item) => item.text !== 'LCL' // Sembunyikan label LCL di legend agar tidak duplikat warna
          }
        }
      },
      scales: {
        y: { title: { display: true, text: 'Nilai Observasi' } },
        x: { title: { display: true, text: 'Sampel ke-' } }
      }
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  calcEOQ();
  initStatTable();
});