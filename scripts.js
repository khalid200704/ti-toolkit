const rp = (n) => 'Rp ' + (Math.round(n * 100) / 100).toLocaleString('id-ID');
const num = (n, d = 2) => (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('id-ID');
const parseList = (str) => str.split(/[,\n\s]+/).map(x => parseFloat(x)).filter(x => !isNaN(x));

const val = (id) => {
  const el = document.getElementById(id);
  return el ? parseFloat(el.value) : 0;
};

const destroyChart = (chart) => { if (chart) chart.destroy(); };

function loadChartJS() {
  return new Promise(resolve => {
    if (typeof Chart !== 'undefined') { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js';
    s.onload = resolve;
    document.head.appendChild(s);
  });
}

let fcChart, bepChart, stChart;

function resultItem(label, value, primary = false) {
  return `<div class="result-item"><div class="label">${label}</div><div class="value${primary ? ' primary' : ''}">${value}</div></div>`;
}

// prefix → section ID mapping untuk resetCalc
const sectionMap = { ss: 'safety', fc: 'forecast', lb: 'linebal' };

function resetCalc(prefix) {
  if (prefix === 'st') {
    initStatTable();
    destroyChart(stChart); stChart = null;
  } else {
    const sectionId = sectionMap[prefix] || prefix;
    document.querySelectorAll(`#calc-${sectionId} input, #calc-${sectionId} textarea`).forEach(e => e.value = '');
    if (prefix === 'fc') { destroyChart(fcChart); fcChart = null; }
    if (prefix === 'bep') { destroyChart(bepChart); bepChart = null; }
  }
  const r = document.getElementById(prefix + '-result');
  if (r) r.classList.add('hidden');
}

function copyResults(prefix) {
  const grid = document.getElementById(prefix + '-result-grid');
  if (!grid) return;
  const items = grid.querySelectorAll('.result-item');
  let text = `=== Hasil Kalkulator TI Toolkit ===\n`;
  items.forEach(item => {
    const label = item.querySelector('.label')?.textContent?.trim() || '';
    const value = item.querySelector('.value')?.textContent?.trim() || '';
    text += `${label}: ${value}\n`;
  });
  text += `\nkhalid200704.github.io`;
  navigator.clipboard.writeText(text).then(() => {
    showCopyFeedback(prefix);
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showCopyFeedback(prefix);
  });
}

function showCopyFeedback(prefix) {
  const btn = document.getElementById('copy-btn-' + prefix);
  if (!btn) return;
  const orig = btn.textContent;
  btn.textContent = '✓ Disalin!';
  btn.style.color = 'var(--success)';
  setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 2000);
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

// ============ EOQ ============
function calcEOQ() {
  const D = val('eoq-d'), S = val('eoq-s'), H = val('eoq-h'), days = val('eoq-days') || 300;
  if (!(D > 0 && S > 0 && H > 0)) return alert('Masukkan nilai D, S, dan H yang valid (> 0).');
  const EOQ = Math.sqrt((2 * D * S) / H);
  const N = D / EOQ;
  const T = days / N;
  const TC = (D / EOQ) * S + (EOQ / 2) * H;
  const holdCost = (EOQ / 2) * H;
  const orderCost = (D / EOQ) * S;

  document.getElementById('eoq-result-grid').innerHTML =
    resultItem('EOQ (Q*)', num(EOQ, 2) + ' unit', true)
    + resultItem('Jumlah Pemesanan/thn', num(N, 2) + ' kali')
    + resultItem('Siklus Pemesanan', num(T, 2) + ' hari')
    + resultItem('Total Biaya Persediaan', rp(TC))
    + resultItem('Biaya Simpan/thn', rp(holdCost))
    + resultItem('Biaya Pesan/thn', rp(orderCost));

  document.getElementById('eoq-detail').innerHTML =
    `<strong>EOQ = √(2·D·S/H)</strong> = √(2×${num(D)}×${num(S)}/${num(H)}) = <strong>${num(EOQ, 2)} unit</strong><br>
     <strong>TC</strong> = Biaya Simpan + Biaya Pesan = ${rp(holdCost)} + ${rp(orderCost)} = <strong>${rp(TC)}</strong><br>
     <span style="color:var(--success)">✓ Pada Q* ini, biaya pesan = biaya simpan (titik optimal).</span>`;

  document.getElementById('eoq-result').classList.remove('hidden');
}

// ============ ROP ============
function calcROP() {
  const d = val('rop-d'), L = val('rop-l'), ss = val('rop-ss') || 0;
  if (!(d > 0 && L > 0)) return alert('Masukkan d dan L yang valid.');
  const ROP = d * L + ss;
  document.getElementById('rop-result-grid').innerHTML =
    resultItem('Reorder Point', num(ROP, 2) + ' unit', true)
    + resultItem('Permintaan Lead Time', num(d * L, 2) + ' unit')
    + resultItem('Safety Stock', num(ss, 2) + ' unit');
  document.getElementById('rop-detail').innerHTML =
    `<strong>ROP = d × L + SS</strong> = ${num(d)} × ${num(L)} + ${num(ss)} = <strong>${num(ROP, 2)} unit</strong><br>
     Lakukan pemesanan ulang saat stok di gudang mencapai <strong>${num(ROP, 2)} unit</strong>.`;
  document.getElementById('rop-result').classList.remove('hidden');
}

// ============ Safety Stock ============
function calcSS() {
  const Z = parseFloat(document.getElementById('ss-service').value);
  const sigma = val('ss-sigma'), L = val('ss-l');
  if (!(sigma > 0 && L > 0)) return alert('Masukkan σd dan L yang valid.');
  const SS = Z * sigma * Math.sqrt(L);
  const sl = document.getElementById('ss-service').options[document.getElementById('ss-service').selectedIndex].text;
  document.getElementById('ss-result-grid').innerHTML =
    resultItem('Safety Stock', num(SS, 2) + ' unit', true)
    + resultItem('Z-score', Z)
    + resultItem('Service Level', sl)
    + resultItem('σd × √L', num(sigma * Math.sqrt(L), 2) + ' unit');
  document.getElementById('ss-detail').innerHTML =
    `<strong>SS = Z × σd × √L</strong> = ${Z} × ${num(sigma)} × √${num(L)} = <strong>${num(SS, 2)} unit</strong><br>
     Dengan service level ${sl}, perusahaan membutuhkan stok pengaman <strong>${num(SS, 2)} unit</strong> untuk mengantisipasi variabilitas permintaan selama lead time.`;
  document.getElementById('ss-result').classList.remove('hidden');
}

// ============ Forecasting ============
async function calcForecast() {
  const method = document.getElementById('fc-method').value;
  const param = document.getElementById('fc-param').value;
  const data = parseList(document.getElementById('fc-data').value);
  if (data.length < 2) return alert('Masukkan minimal 2 data.');
  let forecasts = [];

  if (method === 'ma') {
    const n = parseInt(param);
    if (!(n >= 1 && n <= data.length)) return alert('n harus antara 1 dan jumlah data.');
    for (let i = n; i < data.length; i++) {
      const f = data.slice(i - n, i).reduce((a, b) => a + b, 0) / n;
      forecasts.push({ t: i + 1, actual: data[i], forecast: f, err: data[i] - f });
    }
    const next = data.slice(-n).reduce((a, b) => a + b, 0) / n;
    forecasts.push({ t: data.length + 1, actual: null, forecast: next, err: null });
  } else if (method === 'wma') {
    const weights = parseList(document.getElementById('fc-weights').value);
    const sumW = weights.reduce((a, b) => a + b, 0);
    if (Math.abs(sumW - 1) > 0.01) return alert('Jumlah bobot harus = 1. Saat ini = ' + sumW.toFixed(3));
    const n = weights.length;
    if (n > data.length) return alert('Jumlah bobot tidak boleh melebihi jumlah data.');
    for (let i = n; i < data.length; i++) {
      let f = 0;
      for (let j = 0; j < n; j++) f += weights[j] * data[i - 1 - j];
      forecasts.push({ t: i + 1, actual: data[i], forecast: f, err: data[i] - f });
    }
    let fnext = 0;
    for (let j = 0; j < n; j++) fnext += weights[j] * data[data.length - 1 - j];
    forecasts.push({ t: data.length + 1, actual: null, forecast: fnext, err: null });
  } else if (method === 'es') {
    const alpha = parseFloat(param);
    if (!(alpha > 0 && alpha <= 1)) return alert('α harus antara 0 dan 1.');
    let F = data[0];
    forecasts.push({ t: 1, actual: data[0], forecast: F, err: 0 });
    for (let i = 1; i < data.length; i++) {
      F = alpha * data[i - 1] + (1 - alpha) * F;
      forecasts.push({ t: i + 1, actual: data[i], forecast: F, err: data[i] - F });
    }
    const Fnext = alpha * data[data.length - 1] + (1 - alpha) * F;
    forecasts.push({ t: data.length + 1, actual: null, forecast: Fnext, err: null });
  }

  const valid = forecasts.filter(f => f.actual !== null && f.err !== null);
  const MAD = valid.reduce((a, b) => a + Math.abs(b.err), 0) / valid.length;
  const MSE = valid.reduce((a, b) => a + b.err * b.err, 0) / valid.length;
  const MAPE = valid.reduce((a, b) => a + Math.abs(b.err / b.actual), 0) / valid.length * 100;
  const nextF = forecasts[forecasts.length - 1].forecast;

  const methodLabel = { ma: 'Moving Average', wma: 'Weighted Moving Average', es: 'Exponential Smoothing' }[method];

  document.getElementById('fc-result-grid').innerHTML =
    resultItem('Forecast Periode Berikutnya', num(nextF, 2), true)
    + resultItem('MAD', num(MAD, 2))
    + resultItem('MSE', num(MSE, 2))
    + resultItem('MAPE', num(MAPE, 2) + '%');

  let tableHtml = `<p style="font-size:13px;color:var(--text-muted);margin-bottom:8px;">Metode: <strong>${methodLabel}</strong></p>`;
  tableHtml += '<div style="overflow-x:auto;"><table class="data-table"><tr><th>Periode</th><th>Aktual</th><th>Forecast</th><th>Error</th><th>|Error|</th></tr>';
  forecasts.forEach(f => {
    const rowStyle = f.actual === null ? ' style="background:#eff6ff;"' : '';
    tableHtml += `<tr${rowStyle}><td>${f.t}${f.actual === null ? ' <em>(next)</em>' : ''}</td><td>${f.actual === null ? '—' : num(f.actual, 2)}</td><td>${num(f.forecast, 2)}</td><td>${f.err === null ? '—' : num(f.err, 2)}</td><td>${f.err === null ? '—' : num(Math.abs(f.err), 2)}</td></tr>`;
  });
  tableHtml += '</table></div>';
  document.getElementById('fc-table').innerHTML = tableHtml;
  document.getElementById('fc-result').classList.remove('hidden');

  // Chart
  await loadChartJS();
  const labels = forecasts.map(f => 'P' + f.t);
  const actualValues = forecasts.map(f => f.actual);
  const forecastValues = forecasts.map(f => parseFloat(f.forecast.toFixed(2)));
  const ctx = document.getElementById('fc-chart').getContext('2d');
  destroyChart(fcChart);
  fcChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Data Aktual',
          data: actualValues,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.08)',
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#2563eb',
          fill: true
        },
        {
          label: 'Hasil Forecast',
          data: forecastValues,
          borderColor: '#dc2626',
          borderDash: [6, 4],
          tension: 0.3,
          pointRadius: 5,
          pointBackgroundColor: '#dc2626',
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'top' },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        y: { title: { display: true, text: 'Nilai' } },
        x: { title: { display: true, text: 'Periode' } }
      }
    }
  });
}

// ============ BEP ============
async function calcBEP() {
  const FC = val('bep-fc'), P = val('bep-p'), VC = val('bep-vc'), profit = val('bep-profit') || 0;
  if (!(FC > 0 && P > VC)) return alert('FC harus > 0 dan harga jual harus lebih besar dari biaya variabel.');
  const marg = P - VC;
  const BEP_unit = FC / marg;
  const BEP_rp = BEP_unit * P;
  const targetUnit = (FC + profit) / marg;
  const CMR = (marg / P) * 100;

  document.getElementById('bep-result-grid').innerHTML =
    resultItem('BEP (Unit)', num(BEP_unit, 0) + ' unit', true)
    + resultItem('BEP (Rupiah)', rp(BEP_rp))
    + resultItem('Contribution Margin', rp(marg) + ' /unit')
    + resultItem('CM Ratio', num(CMR, 2) + '%')
    + (profit > 0 ? resultItem('Unit utk Target Laba', num(targetUnit, 0) + ' unit') : '');

  document.getElementById('bep-detail').innerHTML =
    `<strong>Contribution Margin = P − VC</strong> = ${rp(P)} − ${rp(VC)} = <strong>${rp(marg)}/unit</strong><br>
     <strong>BEP Unit = FC / CM</strong> = ${rp(FC)} / ${rp(marg)} = <strong>${num(BEP_unit, 0)} unit</strong><br>
     <strong>BEP Rupiah</strong> = ${num(BEP_unit, 0)} × ${rp(P)} = <strong>${rp(BEP_rp)}</strong>
     ${profit > 0 ? `<br><strong>Unit untuk Target Laba ${rp(profit)}</strong> = (FC + Target) / CM = <strong>${num(targetUnit, 0)} unit</strong>` : ''}`;

  document.getElementById('bep-result').classList.remove('hidden');

  // Chart dengan lebih banyak titik untuk kurva mulus
  await loadChartJS();
  const ctx = document.getElementById('bep-chart').getContext('2d');
  destroyChart(bepChart);
  const steps = 30;
  const maxQ = Math.ceil(BEP_unit * 2.2);
  const stepSize = maxQ / steps;
  const chartLabels = Array.from({ length: steps + 1 }, (_, i) => Math.round(i * stepSize));

  bepChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Total Revenue',
          data: chartLabels.map(q => q * P),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16,185,129,0.07)',
          fill: true,
          tension: 0,
          pointRadius: 0,
          borderWidth: 2
        },
        {
          label: 'Total Cost',
          data: chartLabels.map(q => FC + VC * q),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239,68,68,0.07)',
          fill: true,
          tension: 0,
          pointRadius: 0,
          borderWidth: 2
        },
        {
          label: 'BEP (' + num(BEP_unit, 0) + ' unit)',
          data: chartLabels.map(q => Math.abs(q - Math.round(BEP_unit)) < stepSize / 2 ? BEP_rp : null),
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          pointRadius: chartLabels.map(q => Math.abs(q - Math.round(BEP_unit)) < stepSize / 2 ? 8 : 0),
          showLine: false,
          borderWidth: 0
        }
      ]
    },
    options: {
      responsive: true,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        title: { display: true, text: 'Grafik Break-Even Point', font: { size: 14 } },
        tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ': ' + rp(ctx.raw) } }
      },
      scales: {
        y: {
          ticks: { callback: (v) => 'Rp ' + v.toLocaleString('id-ID') },
          title: { display: true, text: 'Rupiah (Rp)' }
        },
        x: { title: { display: true, text: 'Quantity (Unit)' } }
      }
    }
  });
}

// ============ Takt Time ============
function calcTakt() {
  const T = val('takt-time'), D = val('takt-demand'), CT = val('takt-ct') || 0;
  if (!(T > 0 && D > 0)) return alert('Masukkan waktu & permintaan yang valid.');
  const takt = T / D;
  const gap = CT > 0 ? (CT - takt) : null;
  const util = CT > 0 ? Math.min((CT / takt) * 100, 100) : null;

  document.getElementById('takt-result-grid').innerHTML =
    resultItem('Takt Time', num(takt, 3) + ' menit/unit', true)
    + resultItem('Takt Time (detik)', num(takt * 60, 2) + ' det/unit')
    + (CT > 0 ? resultItem('Cycle Time Aktual', num(CT, 3) + ' menit/unit') : '')
    + (CT > 0 ? resultItem('Gap (CT − Takt)', num(gap, 3) + ' menit') : '')
    + (CT > 0 ? resultItem('Utilisasi Kapasitas', num(util, 1) + '%') : '');

  let status = '';
  if (CT > 0) {
    if (CT > takt) status = `<strong style="color:#dc2626">⚠ CT &gt; Takt Time:</strong> Lini produksi <strong>tidak mampu</strong> memenuhi permintaan pelanggan. Perlu percepatan proses atau tambah kapasitas.`;
    else if (CT < takt) status = `<strong style="color:#f59e0b">CT &lt; Takt Time:</strong> Kapasitas <strong>berlebih</strong>. Ada idle time ${num(gap * -1, 3)} menit/unit — bisa dimanfaatkan atau dikurangi.`;
    else status = `<strong style="color:#10b981">✓ CT = Takt Time:</strong> Lini produksi seimbang sempurna dengan permintaan.`;
  }
  document.getElementById('takt-detail').innerHTML =
    `<strong>Takt Time = T_avail / D</strong> = ${num(T)} menit / ${num(D)} unit = <strong>${num(takt, 3)} menit/unit</strong><br>${status}`;
  document.getElementById('takt-result').classList.remove('hidden');
}

// ============ OEE ============
function calcOEE() {
  const planned = val('oee-planned'), downtime = val('oee-downtime');
  const ict = val('oee-ict'), total = val('oee-total'), good = val('oee-good');
  if (!(planned > 0 && ict > 0 && total > 0)) return alert('Lengkapi input OEE. Total unit harus > 0.');
  if (good > total) return alert('Unit Baik tidak boleh melebihi Total Unit Diproduksi.');
  if (downtime >= planned) return alert('Downtime tidak boleh melebihi atau sama dengan Planned Production Time.');

  const runtime = planned - downtime;
  const A = runtime / planned;
  const P = Math.min((ict * total) / runtime, 1.5); // cap at 150% utk realistic display
  const Q = good / total;
  const OEE = A * P * Q;
  const pct = (x) => num(x * 100, 2) + '%';

  const avLoss = (1 - A) * planned;
  const perfLoss = (1 - Math.min(P, 1)) * runtime;
  const qualLoss = (total - good) * ict;

  let rating, ratingColor;
  if (OEE >= 0.85) { rating = '🏆 World Class (≥85%)'; ratingColor = '#10b981'; }
  else if (OEE >= 0.60) { rating = '📊 Industry Average (60–85%)'; ratingColor = '#f59e0b'; }
  else { rating = '⚠ Perlu Perbaikan (<60%)'; ratingColor = '#dc2626'; }

  document.getElementById('oee-result-grid').innerHTML =
    resultItem('OEE', pct(OEE), true)
    + resultItem('Availability (A)', pct(A))
    + resultItem('Performance (P)', pct(P))
    + resultItem('Quality (Q)', pct(Q))
    + resultItem('Run Time', num(runtime) + ' menit')
    + resultItem('Losses Availability', num(avLoss, 1) + ' menit');

  document.getElementById('oee-detail').innerHTML =
    `<strong>A</strong> = (${num(planned)}−${num(downtime)}) / ${num(planned)} = ${pct(A)}<br>
     <strong>P</strong> = (${num(ict)} × ${num(total)}) / ${num(runtime)} = ${pct(P)}<br>
     <strong>Q</strong> = ${num(good)} / ${num(total)} = ${pct(Q)}<br>
     <strong>OEE = A × P × Q = ${pct(OEE)}</strong> — <strong style="color:${ratingColor}">${rating}</strong><br>
     <strong>Analisis Losses:</strong> Availability loss: ${num(avLoss, 1)} mnt | Performance loss: ${num(perfLoss, 1)} mnt | Quality loss: ${num(qualLoss, 1)} mnt`;

  document.getElementById('oee-result').classList.remove('hidden');
}

// ============ Line Balancing ============
function calcLineBal() {
  const CT = val('lb-ct'), N = val('lb-n');
  const tasks = parseList(document.getElementById('lb-tasks').value);
  if (!(CT > 0 && N > 0 && tasks.length > 0)) return alert('Lengkapi semua input.');
  if (N !== Math.floor(N) || N < 1) return alert('Jumlah workstation harus bilangan bulat positif.');

  const sumT = tasks.reduce((a, b) => a + b, 0);
  const Nmin = Math.ceil(sumT / CT);
  const eff = (sumT / (N * CT)) * 100;
  const balDelay = 100 - eff;
  const maxT = Math.max(...tasks);
  const smoothness = Math.sqrt(tasks.reduce((a, b) => a + Math.pow(maxT - b, 2), 0));

  document.getElementById('lb-result-grid').innerHTML =
    resultItem('N Minimum', Nmin + ' workstation', true)
    + resultItem('Efisiensi Lini', num(eff, 2) + '%')
    + resultItem('Balance Delay', num(balDelay, 2) + '%')
    + resultItem('Total Waktu (ΣTi)', num(sumT, 2) + ' detik')
    + resultItem('Task Terlama', num(maxT, 2) + ' detik')
    + resultItem('Smoothness Index', num(smoothness, 2));

  let warning = maxT > CT ? `<br><strong style="color:#dc2626">⚠ Task terlama (${num(maxT, 2)} det) melebihi CT (${num(CT)} det). CT harus ≥ task terlama!</strong>` : '';

  // Workstation assignment (greedy sequential)
  const stations = Array.from({ length: N }, () => ({ tasks: [], totalTime: 0 }));
  const unassigned = [];
  tasks.forEach((t, i) => {
    let placed = false;
    for (let s = 0; s < N; s++) {
      if (stations[s].totalTime + t <= CT) {
        stations[s].tasks.push({ idx: i + 1, time: t });
        stations[s].totalTime += t;
        placed = true;
        break;
      }
    }
    if (!placed) unassigned.push({ idx: i + 1, time: t });
  });

  let stationHtml = `<p style="font-size:13px;color:var(--text-muted);margin-bottom:8px;"><em>Tabel assignment task ke workstation (metode sequential):</em></p>`;
  stationHtml += '<div style="overflow-x:auto;"><table class="data-table"><tr><th>Workstation</th><th>Task</th><th>Waktu (det)</th><th>Idle Time (det)</th></tr>';
  stations.forEach((s, i) => {
    const idle = CT - s.totalTime;
    const taskList = s.tasks.length > 0
      ? s.tasks.map(t => `T${t.idx}(${t.time}s)`).join(', ')
      : '<em style="color:var(--text-muted)">—</em>';
    const timeStr = s.tasks.length > 0 ? num(s.totalTime, 2) : '0';
    stationHtml += `<tr><td><strong>WS ${i + 1}</strong></td><td>${taskList}</td><td>${timeStr}</td><td>${num(idle, 2)}</td></tr>`;
  });
  stationHtml += '</table></div>';
  if (unassigned.length > 0) {
    stationHtml += `<p style="color:#dc2626;font-size:13px;margin-top:8px;">⚠ ${unassigned.length} task tidak terassign (CT terlalu kecil atau N terlalu sedikit): ${unassigned.map(t => 'T' + t.idx).join(', ')}</p>`;
  }

  document.getElementById('lb-detail').innerHTML =
    `<strong>N* = ⌈ΣTi/CT⌉ = ⌈${num(sumT, 2)}/${num(CT)}⌉ = ${Nmin}</strong> | <strong>Efisiensi = ${num(eff, 2)}%</strong> | Balance Delay = ${num(balDelay, 2)}%${warning}<br><br>${stationHtml}`;
  document.getElementById('lb-result').classList.remove('hidden');
}

// ============ NPV ============
function calcNPV() {
  const I0 = val('npv-i0'), rate = val('npv-rate') / 100;
  const cf = parseList(document.getElementById('npv-cf').value);
  if (!(I0 >= 0 && cf.length > 0)) return alert('Lengkapi input NPV.');
  if (rate < 0) return alert('Discount rate tidak boleh negatif.');

  let NPV = -I0, cumulativePV = -I0, cumulativeCF = -I0, payback = null;
  let rows = [['0', rp(-I0), '—', rp(-I0), rp(-I0), rp(-I0)]];

  for (let i = 0; i < cf.length; i++) {
    const t = i + 1;
    const df = 1 / Math.pow(1 + rate, t);
    const pv = cf[i] * df;
    NPV += pv;
    const prevCumCF = cumulativeCF;
    cumulativePV += pv;
    cumulativeCF += cf[i];
    if (payback === null && cumulativeCF >= 0) payback = t - 1 + Math.abs(prevCumCF) / cf[i];
    rows.push([t, rp(cf[i]), df.toFixed(4), rp(pv), rp(cumulativePV), rp(cumulativeCF)]);
  }

  const decision = NPV >= 0 ? '✓ Layak (NPV ≥ 0)' : '✗ Tidak Layak (NPV < 0)';
  const decisionColor = NPV >= 0 ? 'var(--success)' : '#dc2626';

  document.getElementById('npv-result-grid').innerHTML =
    resultItem('NPV', rp(NPV), true)
    + resultItem('Discount Rate', (rate * 100) + '%/tahun')
    + resultItem('Keputusan Investasi', `<span style="color:${decisionColor}">${decision}</span>`)
    + (payback !== null ? resultItem('Payback Period', num(payback, 2) + ' tahun') : resultItem('Payback Period', 'Belum tercapai'));

  let html = '<div style="overflow-x:auto;"><table class="data-table"><tr><th>Tahun</th><th>Cash Flow</th><th>DF (1+i)^-t</th><th>Present Value</th><th>Kum. PV</th><th>Kum. CF</th></tr>';
  rows.forEach(r => html += `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td></tr>`);
  html += '</table></div>';
  document.getElementById('npv-table').innerHTML = html;
  document.getElementById('npv-result').classList.remove('hidden');
}

// ============ Statistics Table ============
function addStatRow(val = '') {
  const tbody = document.getElementById('st-tbody');
  if (!tbody) return;
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="row-num" style="text-align:center;color:var(--text-muted);font-weight:600;padding:6px 8px;"></td>
    <td style="padding:4px 6px;"><input type="number" class="st-input-val" value="${val}" step="any" style="width:100%;border:1px solid var(--border);border-radius:6px;padding:6px 10px;font-family:inherit;font-size:14px;background:var(--surface);"></td>
    <td style="text-align:center;padding:4px 6px;"><button type="button" class="btn btn-secondary" style="padding:4px 10px;font-size:12px;" onclick="removeStatRow(this)">Hapus</button></td>
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
  [12, 14, 13, 15, 12, 16, 14, 13, 15, 14, 13, 12, 14, 15, 13].forEach(v => addStatRow(v));
}

async function calcStats() {
  const inputs = document.querySelectorAll('.st-input-val');
  const data = Array.from(inputs).map(i => parseFloat(i.value)).filter(v => !isNaN(v));
  if (data.length < 2) return alert('Minimal 2 data valid diperlukan.');

  const n = data.length;
  const mean = data.reduce((a, b) => a + b, 0) / n;
  const sorted = [...data].sort((a, b) => a - b);
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
  const std = Math.sqrt(variance);
  const min = Math.min(...data), max = Math.max(...data);
  const UCL = mean + 3 * std, LCL = mean - 3 * std;

  // Mode
  const freq = {};
  data.forEach(d => freq[d] = (freq[d] || 0) + 1);
  const maxFreq = Math.max(...Object.values(freq));
  const modes = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
  const modeStr = maxFreq === 1 ? 'Tidak ada' : modes.join(', ');

  document.getElementById('st-result-grid').innerHTML =
    resultItem('Mean (x̄)', num(mean, 4), true)
    + resultItem('Median', num(median, 4))
    + resultItem('Modus', modeStr)
    + resultItem('Std Dev (s)', num(std, 4))
    + resultItem('Variance (s²)', num(variance, 4))
    + resultItem('Min / Max', num(min, 2) + ' / ' + num(max, 2))
    + resultItem('Range', num(max - min, 2))
    + resultItem('n (Jumlah Data)', n)
    + resultItem('UCL (x̄ + 3s)', num(UCL, 4))
    + resultItem('LCL (x̄ − 3s)', num(LCL, 4));

  const out = data.filter(d => d > UCL || d < LCL);
  const outPct = (out.length / n * 100).toFixed(1);

  document.getElementById('st-detail').innerHTML =
    `<strong>Mean</strong> = ${num(mean, 4)} | <strong>s</strong> = ${num(std, 4)} | <strong>Variance</strong> = ${num(variance, 4)}<br>
     <strong>UCL</strong> = x̄ + 3s = ${num(mean, 4)} + 3×${num(std, 4)} = <strong>${num(UCL, 4)}</strong><br>
     <strong>LCL</strong> = x̄ − 3s = ${num(mean, 4)} − 3×${num(std, 4)} = <strong>${num(LCL, 4)}</strong><br>
     <strong>Out-of-control:</strong> ${out.length === 0 ? '<span style="color:var(--success)">✓ Tidak ada — proses dalam kendali statistik.</span>' : `<span style="color:#dc2626">⚠ ${out.length} titik (${outPct}%) berada di luar batas kontrol: ${out.join(', ')}.</span>`}`;

  document.getElementById('st-result').classList.remove('hidden');

  // Control Chart
  await loadChartJS();
  const ctx = document.getElementById('st-chart').getContext('2d');
  destroyChart(stChart);
  stChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i + 1),
      datasets: [
        {
          label: 'Observasi',
          data: data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.08)',
          pointBackgroundColor: data.map(v => (v > UCL || v < LCL) ? '#dc2626' : '#2563eb'),
          pointRadius: 5,
          pointHoverRadius: 7,
          borderWidth: 2,
          fill: false,
          tension: 0
        },
        {
          label: 'Mean (x̄)',
          data: Array(n).fill(parseFloat(mean.toFixed(4))),
          borderColor: '#10b981',
          borderDash: [6, 4],
          pointRadius: 0,
          borderWidth: 2,
          fill: false
        },
        {
          label: 'UCL / LCL (±3σ)',
          data: Array(n).fill(parseFloat(UCL.toFixed(4))),
          borderColor: '#dc2626',
          borderDash: [10, 5],
          pointRadius: 0,
          borderWidth: 2,
          fill: false
        },
        {
          label: '_LCL',
          data: Array(n).fill(parseFloat(LCL.toFixed(4))),
          borderColor: '#dc2626',
          borderDash: [10, 5],
          pointRadius: 0,
          borderWidth: 2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Individual Control Chart (X-Chart)', font: { size: 14 } },
        legend: {
          labels: { filter: (item) => !item.text.startsWith('_') }
        },
        tooltip: { mode: 'index', intersect: false }
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
