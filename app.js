// ==========================================
// AI TRADER PRO - Complete Application Logic
// ==========================================

// ===== Telegram WebApp Init =====
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();
tg.enableClosingConfirmation();

// ===== Configuration =====
const CONFIG = {
    refreshInterval: 5000, // Обновление тикера каждые 5 сек
    signalGenerationDelay: 2000, // Задержка генерации сигнала
    categories: {
        forex: {
            name: 'Форекс',
            assets: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'GBP/JPY'],
            basePrices: { min: 0.5, max: 2.0 }
        },
        crypto: {
            name: 'Крипто',
            assets: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'BNB/USD', 'XRP/USD', 'ADA/USD', 'AVAX/USD', 'DOT/USD'],
            basePrices: { min: 0.3, max: 70000 }
        },
        commodities: {
            name: 'Сырьё',
            assets: ['XAU/USD', 'XAG/USD', 'BRENT', 'WTI', 'NGAS', 'COPPER'],
            basePrices: { min: 2, max: 2500 }
        },
        stocks: {
            name: 'Акции',
            assets: ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NFLX', 'AMD', 'INTC'],
            basePrices: { min: 25, max: 1000 }
        }
    },
    totalSignals: 1247,
    totalPips: 2847
};

// ===== State =====
let state = {
    activeCategory: 'forex',
    activeAsset: 'EUR/USD',
    activeTimeframe: '1h',
    chart: null,
    chartData: [],
    currentPrice: 0,
    priceChange: 0,
    signalCount: 12
};

// ===== DOM Elements =====
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const dom = {
    tickerTrack: $('#tickerTrack'),
    assetButtons: $('#assetButtons'),
    chartSymbol: $('#chartSymbol'),
    currentPrice: $('#currentPrice'),
    priceChange: $('#priceChange'),
    signalPlaceholder: $('#signalPlaceholder'),
    signalData: $('#signalData'),
    signalType: $('#signalType'),
    signalEntry: $('#signalEntry'),
    signalSL: $('#signalSL'),
    signalTP1: $('#signalTP1'),
    signalTP2: $('#signalTP2'),
    signalTimestamp: $('#signalTimestamp'),
    confidenceRing: $('#confidenceRing'),
    confidenceText: $('#confidenceText'),
    totalSignals: $('#totalSignals'),
    loadingOverlay: $('#loadingOverlay'),
    toast: $('#toast'),
    toastMessage: $('#toastMessage'),
    generateBtn: $('#generateSignal'),
    refreshBtn: $('#refreshBtn'),
    copyBtn: $('#copySignal')
};

// ===== Price Generator =====
class PriceSimulator {
    constructor(basePrice) {
        this.basePrice = basePrice;
        this.currentPrice = basePrice;
        this.volatility = basePrice * 0.002;
    }

    tick() {
        const change = (Math.random() - 0.48) * this.volatility;
        this.currentPrice += change;
        this.currentPrice = Math.max(this.currentPrice, this.basePrice * 0.95);
        this.currentPrice = Math.min(this.currentPrice, this.basePrice * 1.05);
        return this.currentPrice;
    }

    getChange() {
        return ((this.currentPrice - this.basePrice) / this.basePrice) * 100;
    }
}

let priceSim = new PriceSimulator(1.0892);

// ===== Chart.js =====
function initChart() {
    const ctx = $('#priceChart').getContext('2d');
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');

    state.chartData = generateChartData(50);

    state.chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.chartData.map(d => d.time),
            datasets: [{
                label: 'Price',
                data: state.chartData.map(d => d.price),
                borderColor: '#3b82f6',
                borderWidth: 2,
                fill: true,
                backgroundColor: gradient,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#3b82f6',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index',
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1a2235',
                    titleColor: '#94a3b8',
                    bodyColor: '#f1f5f9',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.y.toFixed(4)}`
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { color: 'rgba(255,255,255,0.02)' },
                    ticks: { 
                        color: '#64748b',
                        font: { size: 10 },
                        maxTicksLimit: 6
                    }
                },
                y: {
                    display: true,
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 10 },
                        callback: (v) => v.toFixed(4)
                    }
                }
            }
        }
    });
}

function generateChartData(count) {
    const data = [];
    let price = priceSim.basePrice;
    const now = new Date();
    
    for (let i = count; i >= 0; i--) {
        price += (Math.random() - 0.48) * priceSim.volatility * 3;
        const time = new Date(now - i * 60000);
        data.push({
            time: time.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            price: parseFloat(price.toFixed(4))
        });
    }
    return data;
}

function updateChart() {
    if (!state.chart) return;
    
    state.chartData.push({
        time: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        price: priceSim.currentPrice
    });
    
    if (state.chartData.length > 50) {
        state.chartData.shift();
    }

    state.chart.data.labels = state.chartData.map(d => d.time);
    state.chart.data.datasets[0].data = state.chartData.map(d => d.price);
    state.chart.update('none');
}

// ===== Ticker =====
function generateTickerItems() {
    const allAssets = [];
    Object.values(CONFIG.categories).forEach(cat => {
        cat.assets.forEach(asset => {
            allAssets.push({ symbol: asset, category: cat.name });
        });
    });

    const doubled = [...allAssets, ...allAssets];
    
    dom.tickerTrack.innerHTML = doubled.map(item => {
        const price = (Math.random() * 1000).toFixed(2);
        const change = (Math.random() * 4 - 2).toFixed(2);
        const isPositive = parseFloat(change) >= 0;
        return `
            <div class="ticker-item">
                <span class="ticker-symbol">${item.symbol}</span>
                <span class="ticker-price">${price}</span>
                <span class="ticker-change ${isPositive ? 'positive' : 'negative'}">
                    ${isPositive ? '+' : ''}${change}%
                </span>
            </div>
        `;
    }).join('');
}

// ===== Asset Selector =====
function renderAssetButtons() {
    const assets = CONFIG.categories[state.activeCategory].assets;
    const cat = CONFIG.categories[state.activeCategory];
    
    dom.assetButtons.innerHTML = assets.map(asset => `
        <button class="asset-chip ${asset === state.activeAsset ? 'active' : ''}" 
                data-asset="${asset}">
            ${asset}
        </button>
    `).join('');

    // Set new base price
    const range = cat.basePrices;
    const newBase = range.min + Math.random() * (range.max - range.min);
    priceSim = new PriceSimulator(newBase);
    
    // Update chart
    state.chartData = generateChartData(50);
    if (state.chart) {
        state.chart.data.labels = state.chartData.map(d => d.time);
        state.chart.data.datasets[0].data = state.chartData.map(d => d.price);
        state.chart.update();
    }
    
    // Update header
    dom.chartSymbol.textContent = asset;
    updatePriceDisplay();
}

// ===== Price Display =====
function updatePriceDisplay() {
    const decimals = state.activeCategory === 'crypto' && 
                     ['BTC/USD'].includes(state.activeAsset) ? 2 : 4;
    
    dom.currentPrice.textContent = priceSim.currentPrice.toFixed(decimals);
    const change = priceSim.getChange();
    dom.priceChange.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    dom.priceChange.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
}

// ===== Signal Generation =====
function generateSignal() {
    // Show loading
    dom.loadingOverlay.classList.add('active');
    dom.generateBtn.disabled = true;

    setTimeout(() => {
        const isLong = Math.random() > 0.4; // Slight long bias
        const currentPrice = priceSim.currentPrice;
        const decimals = state.activeCategory === 'crypto' && 
                         ['BTC/USD'].includes(state.activeAsset) ? 2 : 4;
        
        const slDistance = currentPrice * (0.002 + Math.random() * 0.005);
        const tp1Distance = currentPrice * (0.004 + Math.random() * 0.006);
        const tp2Distance = currentPrice * (0.008 + Math.random() * 0.01);
        
        const entry = currentPrice.toFixed(decimals);
        const sl = isLong ? 
            (currentPrice - slDistance).toFixed(decimals) : 
            (currentPrice + slDistance).toFixed(decimals);
        const tp1 = isLong ? 
            (currentPrice + tp1Distance).toFixed(decimals) : 
            (currentPrice - tp1Distance).toFixed(decimals);
        const tp2 = isLong ? 
            (currentPrice + tp2Distance).toFixed(decimals) : 
            (currentPrice - tp2Distance).toFixed(decimals);
        
        const confidence = 75 + Math.floor(Math.random() * 20);
        
        // Update UI
        dom.signalPlaceholder.classList.add('hidden');
        dom.signalData.classList.remove('hidden');
        
        dom.signalType.innerHTML = isLong ? 
            '<span class="type-badge long">📈 LONG</span>' : 
            '<span class="type-badge short">📉 SHORT</span>';
        
        dom.signalEntry.textContent = entry;
        dom.signalSL.textContent = sl;
        dom.signalTP1.textContent = tp1;
        dom.signalTP2.textContent = tp2;
        
        dom.confidenceText.textContent = `${confidence}%`;
        dom.confidenceRing.setAttribute('stroke-dasharray', `${confidence}, 100`);
        
        dom.signalTimestamp.textContent = new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
        
        dom.totalSignals.textContent = (CONFIG.totalSignals + state.signalCount).toLocaleString();
        state.signalCount++;
        
        // Haptic feedback
        if (tg.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
        }
        
        dom.loadingOverlay.classList.remove('active');
        dom.generateBtn.disabled = false;
        
        showToast('✅ Сигнал сгенерирован');
    }, CONFIG.signalGenerationDelay);
}

// ===== Copy Signal =====
function copySignal() {
    if (dom.signalData.classList.contains('hidden')) return;
    
    const type = dom.signalType.textContent.trim();
    const entry = dom.signalEntry.textContent;
    const sl = dom.signalSL.textContent;
    const tp1 = dom.signalTP1.textContent;
    const tp2 = dom.signalTP2.textContent;
    
    const text = `🤖 AI Trader Pro Signal\n\n` +
                 `📊 ${state.activeAsset}\n` +
                 `🎯 ${type}\n\n` +
                 `Вход: ${entry}\n` +
                 `🛑 SL: ${sl}\n` +
                 `✅ TP1: ${tp1}\n` +
                 `🚀 TP2: ${tp2}\n\n` +
                 `⚡️ Powered by AI Trader Pro`;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast('📋 Сигнал скопирован в буфер обмена');
    }).catch(() => {
        showToast('❌ Ошибка копирования');
    });
}

// ===== Toast =====
function showToast(message) {
    dom.toastMessage.textContent = message;
    dom.toast.classList.add('show');
    
    clearTimeout(dom.toast._timeout);
    dom.toast._timeout = setTimeout(() => {
        dom.toast.classList.remove('show');
    }, 2500);
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Category buttons
    $$('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            state.activeCategory = btn.dataset.category;
            state.activeAsset = CONFIG.categories[state.activeCategory].assets[0];
            
            renderAssetButtons();
            resetSignalCard();
        });
    });

    // Asset chips (делегирование)
    dom.assetButtons.addEventListener('click', (e) => {
        const chip = e.target.closest('.asset-chip');
        if (!chip) return;
        
        $$('.asset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        state.activeAsset = chip.dataset.asset;
        dom.chartSymbol.textContent = state.activeAsset;
        
        // Reset price simulator
        const cat = CONFIG.categories[state.activeCategory];
        const newBase = cat.basePrices.min + Math.random() * (cat.basePrices.max - cat.basePrices.min);
        priceSim = new PriceSimulator(newBase);
        
        state.chartData = generateChartData(50);
        if (state.chart) {
            state.chart.data.labels = state.chartData.map(d => d.time);
            state.chart.data.datasets[0].data = state.chartData.map(d => d.price);
            state.chart.update();
        }
        
        updatePriceDisplay();
        resetSignalCard();
    });

    // Timeframe buttons
    $$('.tf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            $$('.tf-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.activeTimeframe = btn.dataset.tf;
            
            // Regenerate chart with new data count
            const count = state.activeTimeframe === '1m' ? 60 : 
                         state.activeTimeframe === '5m' ? 50 :
                         state.activeTimeframe === '15m' ? 40 :
                         state.activeTimeframe === '1h' ? 30 :
                         state.activeTimeframe === '4h' ? 20 : 15;
            
            state.chartData = generateChartData(count);
            state.chart.data.labels = state.chartData.map(d => d.time);
            state.chart.data.datasets[0].data = state.chartData.map(d => d.price);
            state.chart.update();
        });
    });

    // Generate signal
    dom.generateBtn.addEventListener('click', generateSignal);
    
    // Copy signal
    dom.copyBtn.addEventListener('click', copySignal);
    
    // Refresh
    dom.refreshBtn.addEventListener('click', () => {
        const cat = CONFIG.categories[state.activeCategory];
        const newBase = cat.basePrices.min + Math.random() * (cat.basePrices.max - cat.basePrices.min);
        priceSim = new PriceSimulator(newBase);
        state.chartData = generateChartData(50);
        if (state.chart) {
            state.chart.data.labels = state.chartData.map(d => d.time);
            state.chart.data.datasets[0].data = state.chartData.map(d => d.price);
            state.chart.update();
        }
        updatePriceDisplay();
        if (tg.HapticFeedback) {
            tg.HapticFeedback.impactOccurred('light');
        }
        showToast('🔄 Данные обновлены');
    });
}

function resetSignalCard() {
    dom.signalPlaceholder.classList.remove('hidden');
    dom.signalData.classList.add('hidden');
}

// ===== Price Update Loop =====
function startPriceUpdates() {
    setInterval(() => {
        priceSim.tick();
        updatePriceDisplay();
        updateChart();
    }, 2000);
}

// ===== Init =====
function init() {
    generateTickerItems();
    renderAssetButtons();
    initChart();
    setupEventListeners();
    startPriceUpdates();
    updatePriceDisplay();
    
    // Set initial total signals
    dom.totalSignals.textContent = CONFIG.totalSignals.toLocaleString();
}

// ===== Launch =====
document.addEventListener('DOMContentLoaded', init);