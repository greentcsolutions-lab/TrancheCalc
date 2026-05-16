/**
 * TrancheCalc — app.js
 * Exponential position sizer for retail traders
 * Created by Chris Green | MIT License
 */

'use strict';

// ─── STATE ────────────────────────────────────────────────
let chart = null;
let lastResult = null;

const state = {
  stepMode: 'percent',       // 'percent' | 'fixed'
  allocationMode: 'exponential', // 'exponential' | 'equal' | 'linear'
};

// ─── ELEMENTS ─────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  totalCapital:   $('totalCapital'),
  numTranches:    $('numTranches'),
  numTranchesVal: $('numTranchesVal'),
  startPrice:     $('startPrice'),
  stepPercent:    $('stepPercent'),
  stepFixed:      $('stepFixed'),
  expFactor:      $('expFactor'),
  expFactorVal:   $('expFactorVal'),
  ticker:         $('ticker'),
  trancheBody:    $('trancheBody'),
  sumTotal:       $('sumTotal'),
  sumShares:      $('sumShares'),
  sumAvgCost:     $('sumAvgCost'),
  sumBreakEven:   $('sumBreakEven'),
  chartSubtitle:  $('chartSubtitle'),
  tableMeta:      $('tableMeta'),
  toast:          $('toast'),
};

// ─── CALCULATIONS ─────────────────────────────────────────

/**
 * Generate price levels for each tranche
 */
function generatePrices(startPrice, numTranches, stepMode, stepPercent, stepFixed) {
  const prices = [];
  let price = startPrice;
  for (let i = 0; i < numTranches; i++) {
    prices.push(price);
    if (stepMode === 'percent') {
      price = price * (1 - stepPercent / 100);
    } else {
      price = price - stepFixed;
    }
    if (price <= 0) {
      // Fill remaining with 0 guard
      for (let j = i + 1; j < numTranches; j++) prices.push(0.01);
      break;
    }
  }
  return prices;
}

/**
 * Generate allocation weights per tranche
 * Exponential: each successive tranche gets expFactor× more than previous
 * Linear: linearly increasing weights
 * Equal: all equal
 */
function generateWeights(numTranches, mode, expFactor) {
  const raw = [];
  for (let i = 0; i < numTranches; i++) {
    if (mode === 'exponential') {
      raw.push(Math.pow(expFactor, i));
    } else if (mode === 'linear') {
      raw.push(i + 1);
    } else {
      raw.push(1);
    }
  }
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map(w => w / total);
}

/**
 * Core calculation — returns array of tranche objects + summary
 */
function calculate(params) {
  const {
    totalCapital,
    numTranches,
    startPrice,
    stepMode,
    stepPercent,
    stepFixed,
    allocationMode,
    expFactor,
  } = params;

  const prices  = generatePrices(startPrice, numTranches, stepMode, stepPercent, stepFixed);
  const weights = generateWeights(numTranches, allocationMode, expFactor);

  let cumulShares = 0;
  let cumulDollars = 0;

  const tranches = prices.map((price, i) => {
    const allocation = totalCapital * weights[i];
    const shares     = price > 0 ? allocation / price : 0;
    cumulShares  += shares;
    cumulDollars += allocation;
    return {
      index:       i + 1,
      price,
      allocation,
      weight:      weights[i],
      shares,
      cumulShares,
      cumulDollars,
    };
  });

  const totalShares   = cumulShares;
  const avgCost       = totalShares > 0 ? totalCapital / totalShares : 0;
  const breakEven     = avgCost; // same as avg cost in DCA context

  return {
    tranches,
    summary: { totalCapital, totalShares, avgCost, breakEven },
  };
}

// ─── FORMATTING ───────────────────────────────────────────
const fmt = {
  dollar: v => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  shares: v => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
  pct:    v => (v * 100).toFixed(1) + '%',
};

// ─── RENDER ───────────────────────────────────────────────

function renderTable(tranches) {
  const maxAlloc = Math.max(...tranches.map(t => t.allocation));

  els.trancheBody.innerHTML = tranches.map((t, i) => {
    const barWidth = Math.round((t.allocation / maxAlloc) * 80);
    return `
      <tr style="animation-delay: ${i * 30}ms">
        <td><span class="tranche-index">${t.index}</span></td>
        <td>${fmt.dollar(t.price)}</td>
        <td>${fmt.dollar(t.allocation)}</td>
        <td>
          <div class="pct-cell">
            <span class="pct-bar" style="width:${barWidth}px"></span>
            ${fmt.pct(t.weight)}
          </div>
        </td>
        <td>${fmt.shares(t.shares)}</td>
        <td>${fmt.shares(t.cumulShares)}</td>
        <td>${fmt.dollar(t.cumulDollars)}</td>
      </tr>`;
  }).join('');
}

function renderSummary(summary) {
  els.sumTotal.textContent    = fmt.dollar(summary.totalCapital);
  els.sumShares.textContent   = fmt.shares(summary.totalShares);
  els.sumAvgCost.textContent  = fmt.dollar(summary.avgCost);
  els.sumBreakEven.textContent = fmt.dollar(summary.breakEven);
}

function renderChart(tranches, ticker) {
  const labels = tranches.map(t => fmt.dollar(t.price));
  const dollars = tranches.map(t => +t.allocation.toFixed(2));
  const sharesData = tranches.map(t => +t.shares.toFixed(4));

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
  const tickColor = isDark ? '#404060' : '#9090c0';
  const bgColor   = isDark ? 'rgba(245,158,11,0.12)' : 'rgba(180,83,9,0.08)';

  if (chart) chart.destroy();

  chart = new Chart($('allocationChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '$ Allocation',
          data: dollars,
          backgroundColor: bgColor,
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderRadius: 3,
          order: 2,
        },
        {
          label: 'Shares',
          data: sharesData,
          type: 'line',
          borderColor: '#10b981',
          borderWidth: 2,
          pointBackgroundColor: '#10b981',
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.35,
          fill: false,
          yAxisID: 'y2',
          order: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: tickColor,
            font: { family: "'Space Mono', monospace", size: 10 },
            boxWidth: 10,
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#1a1a28' : '#fff',
          titleColor: isDark ? '#e8e8f0' : '#1a1a30',
          bodyColor: isDark ? '#7070a0' : '#5050a0',
          borderColor: '#f59e0b',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: "'Space Mono', monospace", size: 11 },
          bodyFont: { family: "'Space Mono', monospace", size: 10 },
          callbacks: {
            title: ctx => `Tranche ${ctx[0].dataIndex + 1} @ ${ctx[0].label}`,
            label: ctx => {
              if (ctx.datasetIndex === 0) return ` Allocation: ${fmt.dollar(ctx.raw)}`;
              return ` Shares: ${fmt.shares(ctx.raw)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: tickColor, font: { family: "'Space Mono', monospace", size: 9 } },
          grid: { color: gridColor },
        },
        y: {
          ticks: {
            color: tickColor,
            font: { family: "'Space Mono', monospace", size: 9 },
            callback: v => '$' + v.toLocaleString(),
          },
          grid: { color: gridColor },
          title: { display: false },
        },
        y2: {
          position: 'right',
          ticks: {
            color: '#10b981',
            font: { family: "'Space Mono', monospace", size: 9 },
            callback: v => v.toFixed(2),
          },
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

// ─── MAIN CALCULATE ───────────────────────────────────────

function runCalculation() {
  const totalCapital = parseFloat(els.totalCapital.value);
  const numTranches  = parseInt(els.numTranches.value);
  const startPrice   = parseFloat(els.startPrice.value);
  const stepPercent  = parseFloat(els.stepPercent.value);
  const stepFixed    = parseFloat(els.stepFixed.value);
  const expFactor    = parseFloat(els.expFactor.value);
  const ticker       = els.ticker.value.trim().toUpperCase() || 'ASSET';

  // Validate
  if (isNaN(totalCapital) || totalCapital <= 0) { showToast('⚠ Enter a valid total capital'); return; }
  if (isNaN(startPrice)   || startPrice   <= 0) { showToast('⚠ Enter a valid entry price'); return; }
  if (state.stepMode === 'fixed' && (isNaN(stepFixed) || stepFixed <= 0)) { showToast('⚠ Enter a valid fixed step'); return; }

  const result = calculate({
    totalCapital,
    numTranches,
    startPrice,
    stepMode:       state.stepMode,
    stepPercent,
    stepFixed,
    allocationMode: state.allocationMode,
    expFactor,
  });

  lastResult = { ...result, ticker, params: { totalCapital, numTranches, startPrice, stepPercent, stepFixed, expFactor } };

  renderSummary(result.summary);
  renderTable(result.tranches);
  renderChart(result.tranches, ticker);

  // Metadata
  const lowestPrice = result.tranches[result.tranches.length - 1].price;
  els.chartSubtitle.textContent = `${ticker} · ${numTranches} tranches · ${fmt.dollar(startPrice)} → ${fmt.dollar(lowestPrice)}`;
  els.tableMeta.textContent = `${numTranches} levels · ${state.allocationMode} curve`;

  showToast('✓ Calculated');
}

// ─── EXPORT ───────────────────────────────────────────────

function exportCSV() {
  if (!lastResult) { showToast('⚠ Run calculation first'); return; }
  const { tranches, ticker } = lastResult;

  const header = ['Tranche', 'Price ($)', 'Allocation ($)', '% of Total', 'Shares', 'Cumulative Shares', 'Cumulative $'];
  const rows = tranches.map(t => [
    t.index,
    t.price.toFixed(4),
    t.allocation.toFixed(2),
    (t.weight * 100).toFixed(2) + '%',
    t.shares.toFixed(4),
    t.cumulShares.toFixed(4),
    t.cumulDollars.toFixed(2),
  ]);

  const csvContent = [header, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `tranche-${ticker}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✓ CSV downloaded');
}

function exportPDF() {
  if (!lastResult) { showToast('⚠ Run calculation first'); return; }
  const { tranches, summary, ticker } = lastResult;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Header
  doc.setFont('courier', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 50);
  doc.text('TrancheCalc — Position Sizing Report', 14, 18);

  doc.setFont('courier', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 130);
  doc.text(`Ticker: ${ticker}   |   Generated: ${new Date().toLocaleString()}   |   Created by Chris Green`, 14, 25);

  // Summary row
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 50);
  const s = summary;
  doc.text(
    `Total Deployed: ${fmt.dollar(s.totalCapital)}   |   Total Shares: ${fmt.shares(s.totalShares)}   |   Avg Cost: ${fmt.dollar(s.avgCost)}   |   Break-even: ${fmt.dollar(s.breakEven)}`,
    14, 32
  );

  // Table
  doc.autoTable({
    startY: 38,
    head: [['#', 'Price ($)', 'Allocation ($)', '% of Total', 'Shares', 'Cumul. Shares', 'Cumul. $']],
    body: tranches.map(t => [
      t.index,
      t.price.toFixed(4),
      t.allocation.toFixed(2),
      (t.weight * 100).toFixed(2) + '%',
      t.shares.toFixed(4),
      t.cumulShares.toFixed(4),
      t.cumulDollars.toFixed(2),
    ]),
    styles: { font: 'courier', fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 255] },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text('TrancheCalc · Created by Chris Green · Client-side only · No data sent anywhere', 14, doc.internal.pageSize.height - 8);
  }

  doc.save(`tranche-${ticker}-${Date.now()}.pdf`);
  showToast('✓ PDF downloaded');
}

// ─── SAVE / LOAD ──────────────────────────────────────────

function saveConfig() {
  const config = {
    totalCapital:   els.totalCapital.value,
    numTranches:    els.numTranches.value,
    startPrice:     els.startPrice.value,
    stepMode:       state.stepMode,
    stepPercent:    els.stepPercent.value,
    stepFixed:      els.stepFixed.value,
    allocationMode: state.allocationMode,
    expFactor:      els.expFactor.value,
    ticker:         els.ticker.value,
  };
  localStorage.setItem('tranchecalc_config', JSON.stringify(config));
  showToast('✓ Config saved');
}

function loadConfig() {
  const raw = localStorage.getItem('tranchecalc_config');
  if (!raw) { showToast('⚠ No saved config found'); return; }
  try {
    const config = JSON.parse(raw);
    els.totalCapital.value = config.totalCapital ?? 10000;
    els.numTranches.value  = config.numTranches ?? 5;
    els.startPrice.value   = config.startPrice ?? 100;
    els.stepPercent.value  = config.stepPercent ?? 5;
    els.stepFixed.value    = config.stepFixed ?? 5;
    els.expFactor.value    = config.expFactor ?? 2;
    els.ticker.value       = config.ticker ?? '';

    // Sync range displays
    els.numTranchesVal.textContent = config.numTranches ?? 5;
    els.expFactorVal.textContent   = parseFloat(config.expFactor ?? 2).toFixed(1);

    // Sync toggle modes
    setStepMode(config.stepMode ?? 'percent');
    setAllocationMode(config.allocationMode ?? 'exponential');

    runCalculation();
    showToast('✓ Config loaded');
  } catch {
    showToast('⚠ Failed to load config');
  }
}

function resetConfig() {
  els.totalCapital.value = 10000;
  els.numTranches.value  = 5;
  els.numTranchesVal.textContent = 5;
  els.startPrice.value   = 100;
  els.stepPercent.value  = 5;
  els.stepFixed.value    = 5;
  els.expFactor.value    = 2;
  els.expFactorVal.textContent = '2.0';
  els.ticker.value       = 'AAPL';
  setStepMode('percent');
  setAllocationMode('exponential');
  showToast('✓ Reset to defaults');
}

// ─── SHARE ────────────────────────────────────────────────

function shareLink() {
  const url = window.location.href.split('?')[0];
  navigator.clipboard.writeText(url).then(() => {
    showToast('✓ Link copied to clipboard');
  }).catch(() => {
    showToast('Link: ' + url);
  });
}

// ─── THEME ────────────────────────────────────────────────

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('tranchecalc_theme', next);
  // Re-render chart if exists
  if (lastResult) {
    renderChart(lastResult.tranches, lastResult.ticker);
  }
}

// ─── TOAST ────────────────────────────────────────────────

let toastTimer = null;
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
}

// ─── TOGGLE MODE HELPERS ──────────────────────────────────

function setStepMode(mode) {
  state.stepMode = mode;
  document.querySelectorAll('#stepMode .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  $('percentGroup').classList.toggle('hidden', mode !== 'percent');
  $('fixedGroup').classList.toggle('hidden', mode !== 'fixed');
}

function setAllocationMode(mode) {
  state.allocationMode = mode;
  document.querySelectorAll('#allocationMode .toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  $('expFactorGroup').classList.toggle('hidden', mode !== 'exponential');
}

// ─── EVENT LISTENERS ──────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {

  // Restore theme
  const savedTheme = localStorage.getItem('tranchecalc_theme');
  if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);

  // Range sliders live display
  els.numTranches.addEventListener('input', () => {
    els.numTranchesVal.textContent = els.numTranches.value;
  });
  els.expFactor.addEventListener('input', () => {
    els.expFactorVal.textContent = parseFloat(els.expFactor.value).toFixed(1);
  });

  // Step mode toggles
  document.querySelectorAll('#stepMode .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => setStepMode(btn.dataset.mode));
  });

  // Allocation mode toggles
  document.querySelectorAll('#allocationMode .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => setAllocationMode(btn.dataset.mode));
  });

  // Buttons
  $('calcBtn').addEventListener('click', runCalculation);
  $('saveBtn').addEventListener('click', saveConfig);
  $('loadBtn').addEventListener('click', loadConfig);
  $('resetBtn').addEventListener('click', resetConfig);
  $('shareBtn').addEventListener('click', shareLink);
  $('themeToggle').addEventListener('click', toggleTheme);
  $('exportCsvBtn').addEventListener('click', exportCSV);
  $('exportPdfBtn').addEventListener('click', exportPDF);

  // Run on Enter key in any input
  document.querySelectorAll('input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') runCalculation();
    });
  });

  // Auto-calculate on load
  runCalculation();
});
