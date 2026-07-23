const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ===== DATA =====
const markets = {
    forex: {
        assets: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'EUR/GBP'],
        basePrices: [1.0892, 1.2640, 151.50, 0.6520, 1.3580, 0.8520],
        decimals: [4, 4, 2, 4, 4, 4]
    },
    commodities: {
        assets: ['XAU/USD', 'XAG/USD', 'BRENT', 'WTI', 'NGAS'],
        basePrices: [2420.50, 28.55, 82.40, 78.60, 2.82],
        decimals: [2, 2, 2, 2, 3]
    },
    stocks: {
        assets: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN'],
        basePrices: [185.50, 245.80, 875.20, 415.30, 142.60, 178.90],
        decimals: [2, 2, 2, 2, 2, 2]
    }
};

// ===== STATE =====
let activeMarket = 'forex';
let activeIdx = 0;
let activeAsset = 'EUR/USD';
let basePrice = 1.0892;
let currentPrice = 1.0892;
let priceHistory = [];
let chart = null;
let canSignal = true;
let signalCooldown = 60;
let cooldownInterval = null;

// ===== DOM =====
const $ = s => document.querySelector(s);
const dom = {
    marketTabs: $('#marketTabs'),
    assetScroll: $('#assetScroll'),
    chartSymbol: $('#chartSymbol'),
    chartPrice: $('#chartPrice'),
    chartChange: $('#chartChange'),
    signalBtn: $('#signalBtn'),
    signalTimer: $('#signalTimer'),
    signalResult: $('#signalResult'),
    signalBadge: $('#signalBadge'),
    signalConf: $('#signalConf'),
    signalAssetName: $('#signalAssetName'),
    signalEntry: $('#signalEntry'),
    signalSL: $('#signalSL'),
    signalTP: $('#signalTP'),
    signalTime: $('#signalTime'),
    toast: $('#toast'),
    toastMsg: $('#toastMsg')
};

// ===== INIT =====
function init() {
    renderAssets();
    initChart();
    startPriceFeed();
    setupEvents();
}

// ===== RENDER =====
function renderAssets() {
    const m = markets[activeMarket];
    dom.assetScroll.innerHTML = m.assets.map((a, i) =>
        `<button class="asset-chip ${i === 0 ? 'active' : ''}" data-idx="${i}">${a}</button>`
    ).join('');
    selectAsset(0);
}

function selectAsset(idx) {
    activeIdx = idx;
    const m = markets[activeMarket];
    activeAsset = m.assets[idx];
    basePrice = m.basePrices[idx];
    currentPrice = basePrice;
    priceHistory = generateHistory(60);
    dom.chartSymbol.textContent = activeAsset;
    updateChart();
    updatePrice();
    dom.signalResult.classList.add('hidden');
    document.querySelectorAll('.asset-chip').forEach((c, i) => c.classList.toggle('active', i === idx));
}

function generateHistory(n) {
    let p = basePrice;
    const arr = [];
    for (let i = 0; i < n; i++) {
        p += (Math.random() - 0.48) * basePrice * 0.0015;
        arr.push(p);
    }
    return arr;
}

// ===== CHART =====
function initChart() {
    const ctx = $('#mainChart').getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(77,124,255,0.2)');
    grad.addColorStop(1, 'rgba(77,124,255,0)');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(60).fill(''),
            datasets: [{
                data: priceHistory,
                borderColor: '#4d7cff',
                borderWidth: 2,
                fill: true,
                backgroundColor: grad,
                tension: 0.35,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 200 },
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: {
                    grid: { color: 'rgba(255,255,255,0.03)' },
                    ticks: { color: '#555b68', font: { size: 10 } }
                }
            }
        }
    });
}

function updateChart() {
    if (!chart) return;
    chart.data.datasets[0].data = priceHistory;
    chart.update('none');
}

// ===== PRICE FEED =====
function startPriceFeed() {
    setInterval(() => {
        currentPrice += (Math.random() - 0.48) * basePrice * 0.0008;
        priceHistory.push(currentPrice);
        if (priceHistory.length > 60) priceHistory.shift();
        updateChart();
        updatePrice();
    }, 1000);
}

function updatePrice() {
    const dec = markets[activeMarket].decimals[activeIdx];
    dom.chartPrice.textContent = currentPrice.toFixed(dec);
    const ch = ((currentPrice - basePrice) / basePrice) * 100;
    dom.chartChange.textContent = `${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%`;
    dom.chartChange.className = `chart-change ${ch >= 0 ? 'up' : 'down'}`;
}

// ===== SIGNAL =====
function generateSignal() {
    if (!canSignal) return;
    canSignal = false;
    dom.signalBtn.disabled = true;

    // Cooldown
    signalCooldown = 60;
    dom.signalTimer.textContent = '60с';
    cooldownInterval = setInterval(() => {
        signalCooldown--;
        dom.signalTimer.textContent = `${signalCooldown}с`;
        if (signalCooldown <= 0) {
            clearInterval(cooldownInterval);
            canSignal = true;
            dom.signalBtn.disabled = false;
            dom.signalTimer.textContent = '';
        }
    }, 1000);

    // Generate
    const isLong = Math.random() > 0.42;
    const conf = 78 + Math.floor(Math.random() * 18);
    const dec = markets[activeMarket].decimals[activeIdx];
    const entry = currentPrice.toFixed(dec);
    const sl = isLong
        ? (currentPrice * 0.996).toFixed(dec)
        : (currentPrice * 1.004).toFixed(dec);
    const tp = isLong
        ? (currentPrice * 1.008).toFixed(dec)
        : (currentPrice * 0.992).toFixed(dec);

    dom.signalResult.classList.remove('hidden');
    dom.signalBadge.textContent = isLong ? '📈 LONG' : '📉 SHORT';
    dom.signalBadge.className = `signal-badge ${isLong ? 'long' : 'short'}`;
    dom.signalConf.textContent = `${conf}% уверенность`;
    dom.signalAssetName.textContent = activeAsset;
    dom.signalEntry.textContent = entry;
    dom.signalSL.textContent = sl;
    dom.signalTP.textContent = tp;
    dom.signalTime.textContent = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showToast(`✅ ${isLong ? 'LONG' : 'SHORT'} • ${activeAsset}`);
}

function copySignal() {
    const text = `🤖 Gemini Signal AI\n\n📊 ${activeAsset}\n🎯 ${dom.signalBadge.textContent}\n💪 ${dom.signalConf.textContent}\n⏱ Таймфрейм: 1 мин\n📈 Вход: ${dom.signalEntry.textContent}\n🛑 SL: ${dom.signalSL.textContent}\n✅ TP: ${dom.signalTP.textContent}`;
    navigator.clipboard.writeText(text).then(() => showToast('📋 Скопировано'));
}

// ===== TOAST =====
function showToast(msg) {
    dom.toastMsg.textContent = msg;
    dom.toast.classList.add('show');
    clearTimeout(dom.toast._t);
    dom.toast._t = setTimeout(() => dom.toast.classList.remove('show'), 2000);
}

// ===== EVENTS =====
function setupEvents() {
    dom.marketTabs.addEventListener('click', e => {
        const tab = e.target.closest('.market-tab');
        if (!tab) return;
        document.querySelectorAll('.market-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeMarket = tab.dataset.market;
        renderAssets();
        dom.signalResult.classList.add('hidden');
    });

    dom.assetScroll.addEventListener('click', e => {
        const chip = e.target.closest('.asset-chip');
        if (!chip) return;
        selectAsset(parseInt(chip.dataset.idx));
    });

    dom.signalBtn.addEventListener('click', generateSignal);

    document.addEventListener('click', e => {
        if (e.target.closest('#copyBtn')) copySignal();
        if (e.target.closest('#newSignalBtn')) generateSignal();
    });
}

document.addEventListener('DOMContentLoaded', init);