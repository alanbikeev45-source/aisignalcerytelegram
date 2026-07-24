const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ===== DATA =====
const markets = {
    forex: {
        assets: ['EUR/USD','GBP/USD','USD/JPY','AUD/USD','USD/CAD','EUR/GBP'],
        prices: [1.0892,1.2640,151.50,0.6520,1.3580,0.8520],
        dec: [4,4,2,4,4,4]
    },
    commodities: {
        assets: ['XAU/USD','XAG/USD','BRENT','WTI','NGAS'],
        prices: [2420.5,28.55,82.40,78.60,2.820],
        dec: [2,2,2,2,3]
    },
    stocks: {
        assets: ['AAPL','TSLA','NVDA','MSFT','GOOGL','AMZN'],
        prices: [185.50,245.80,875.20,415.30,142.60,178.90],
        dec: [2,2,2,2,2,2]
    }
};

// ===== STATE =====
let activeMarket = 'forex';
let activeIdx = 0;
let activeAsset = 'EUR/USD';
let basePrice = 1.0892;
let currentPrice = 1.0892;
let ohlcData = [];
let chart = null;

// ===== DOM =====
const $ = s => document.querySelector(s);
const dom = {
    markets: $('#markets'),
    assetsRow: $('#assetsRow'),
    chartSymbol: $('#chartSymbol'),
    chartPrice: $('#chartPrice'),
    chartChange: $('#chartChange'),
    signalBtn: $('#signalBtn'),
    signalCard: $('#signalCard'),
    signalType: $('#signalType'),
    signalConf: $('#signalConf'),
    signalAsset: $('#signalAsset'),
    signalEntry: $('#signalEntry'),
    signalTime: $('#signalTime'),
    toast: $('#toast'),
    toastMsg: $('#toastMsg')
};

// ===== INIT =====
function init() {
    generateOHLC();
    renderAssets();
    initChart();
    startPrice();
    events();
}

// ===== OHLC Generator =====
function generateOHLC() {
    ohlcData = [];
    let open = basePrice;
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
        const close = open + (Math.random() - 0.45) * basePrice * 0.003;
        const high = Math.max(open, close) + Math.random() * basePrice * 0.001;
        const low = Math.min(open, close) - Math.random() * basePrice * 0.001;
        ohlcData.push({
            x: now - i * 60000,
            o: +open.toFixed(5),
            h: +high.toFixed(5),
            l: +low.toFixed(5),
            c: +close.toFixed(5)
        });
        open = close;
    }
    currentPrice = ohlcData[ohlcData.length - 1].c;
}

// ===== Chart =====
function initChart() {
    const ctx = $('#candleChart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'candlestick',
        data: {
            datasets: [{
                data: ohlcData,
                borderColor: '#00d4ff',
                backgroundColor: { up: 'rgba(0,255,136,0.7)', down: 'rgba(255,45,85,0.7)' },
                borderWidth: 1,
                barThickness: 8,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 100 },
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    type: 'time',
                    time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } },
                    ticks: { color: '#4a5070', font: { size: 9 }, maxTicksLimit: 5 },
                    grid: { color: 'rgba(255,255,255,0.02)' }
                },
                y: {
                    ticks: { color: '#4a5070', font: { size: 9 } },
                    grid: { color: 'rgba(255,255,255,0.03)' }
                }
            }
        }
    });
}

function updateChart() {
    chart.data.datasets[0].data = ohlcData;
    chart.update('none');
}

// ===== Live Price =====
function startPrice() {
    setInterval(() => {
        const last = ohlcData[ohlcData.length - 1];
        last.c += (Math.random() - 0.48) * basePrice * 0.0005;
        last.h = Math.max(last.h, last.c);
        last.l = Math.min(last.l, last.c);
        currentPrice = last.c;
        if (ohlcData.length > 30) ohlcData.shift();
        updateChart();
        updateDisplay();
    }, 1000);
}

function updateDisplay() {
    const dec = markets[activeMarket].dec[activeIdx];
    dom.chartPrice.textContent = currentPrice.toFixed(dec);
    const ch = ((currentPrice - basePrice) / basePrice) * 100;
    dom.chartChange.textContent = `${ch>=0?'+':''}${ch.toFixed(2)}%`;
    dom.chartChange.className = `chart-change ${ch>=0?'up':'down'}`;
}

// ===== Render =====
function renderAssets() {
    const m = markets[activeMarket];
    dom.assetsRow.innerHTML = m.assets.map((a,i) =>
        `<button class="asset-chip ${i===0?'active':''}" data-idx="${i}">${a}</button>`
    ).join('');
    selectAsset(0);
}

function selectAsset(idx) {
    activeIdx = idx;
    const m = markets[activeMarket];
    activeAsset = m.assets[idx];
    basePrice = m.prices[idx];
    dom.chartSymbol.textContent = activeAsset;
    generateOHLC();
    updateChart();
    updateDisplay();
    dom.signalCard.classList.add('hidden');
    document.querySelectorAll('.asset-chip').forEach((c,i) => c.classList.toggle('active', i===idx));
}

// ===== Signal =====
function getSignal() {
    const isCall = Math.random() > 0.42;
    const conf = 78 + Math.floor(Math.random() * 18);
    const dec = markets[activeMarket].dec[activeIdx];

    dom.signalCard.classList.remove('hidden');
    dom.signalType.textContent = isCall ? 'CALL ▲' : 'PUT ▼';
    dom.signalType.className = `signal-type ${isCall ? 'call' : 'put'}`;
    dom.signalConf.textContent = `${conf}%`;
    dom.signalAsset.textContent = activeAsset;
    dom.signalEntry.textContent = currentPrice.toFixed(dec);
    dom.signalTime.textContent = new Date().toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit',second:'2-digit'});

    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    showToast(`✅ ${isCall ? 'CALL ▲' : 'PUT ▼'} • ${activeAsset}`);
}

function copySignal() {
    const text = `🤖 Gemini Signal AI\n📊 ${activeAsset}\n🎯 ${dom.signalType.textContent}\n💪 Уверенность: ${dom.signalConf.textContent}\n⏱ Экспирация: 1 мин\n📈 Вход: ${dom.signalEntry.textContent}`;
    navigator.clipboard.writeText(text).then(() => showToast('📋 Скопировано'));
}

// ===== Toast =====
function showToast(msg) {
    dom.toastMsg.textContent = msg;
    dom.toast.classList.add('show');
    clearTimeout(dom.toast._t);
    dom.toast._t = setTimeout(() => dom.toast.classList.remove('show'), 1800);
}

// ===== Events =====
function events() {
    dom.markets.addEventListener('click', e => {
        const btn = e.target.closest('.market-btn');
        if (!btn) return;
        document.querySelectorAll('.market-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeMarket = btn.dataset.market;
        renderAssets();
    });

    dom.assetsRow.addEventListener('click', e => {
        const chip = e.target.closest('.asset-chip');
        if (!chip) return;
        selectAsset(+chip.dataset.idx);
    });

    dom.signalBtn.addEventListener('click', getSignal);
    document.addEventListener('click', e => {
        if (e.target.closest('#copyBtn')) copySignal();
        if (e.target.closest('#againBtn')) getSignal();
    });
}

document.addEventListener('DOMContentLoaded', init);