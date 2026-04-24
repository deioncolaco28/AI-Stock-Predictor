// Stock Market Interactive Background
const initStockBackground = () => {
    const canvas = document.getElementById('stock-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let gridOffset = 0;
    
    // Candlesticks
    let candles = [];
    const candleWidth = 6;
    const spacing = 15;
    
    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initCandles();
    }
    
    function initCandles() {
        candles = [];
        const numCandles = Math.ceil(width / spacing) + 10;
        let currentPrice = height / 2;
        
        for (let i = 0; i < numCandles; i++) {
            let change = (Math.random() - 0.5) * 40;
            let open = currentPrice;
            let close = currentPrice + change;
            let high = Math.max(open, close) + Math.random() * 20;
            let low = Math.min(open, close) - Math.random() * 20;
            
            candles.push({ open, close, high, low, x: i * spacing });
            currentPrice = close;
        }
    }
    
    let mouse = { x: -1000, y: -1000 };
    window.addEventListener('resize', resize);
    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });
    
    // Tickers
    let tickers = [];
    const symbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'NIFTY', 'SENSEX', 'SBIN', 'BHARTIARTL', 'ITC'];
    for(let i=0; i<15; i++){
        tickers.push({
            sym: symbols[Math.floor(Math.random() * symbols.length)],
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            speed: Math.random() * 0.5 + 0.2,
            val: (Math.random() * 3000 + 100).toFixed(2),
            isUp: Math.random() > 0.5
        });
    }
    
    function drawGrid() {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        
        for (let x = gridOffset % 50; x < width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        
        for (let y = 0; y < height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }
    
    function drawFloatingTickers() {
        ctx.font = "bold 14px Outfit";
        tickers.forEach(t => {
            t.y -= t.speed;
            if (t.y < -20) {
                t.y = height + 20;
                t.x = Math.random() * width;
                t.sym = symbols[Math.floor(Math.random() * symbols.length)];
                t.val = (Math.random() * 3000 + 100).toFixed(2);
                t.isUp = Math.random() > 0.5;
            }
            
            let dx = mouse.x - width/2;
            let dy = mouse.y - height/2;
            let pX = t.x - dx * 0.05 * t.speed;
            let pY = t.y - dy * 0.05 * t.speed;
            
            let color = t.isUp ? '#00ffcc' : '#ff4757';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fillText(t.sym, pX, pY);
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.5;
            ctx.fillText(t.isUp ? `▲${t.val}` : `▼${t.val}`, pX, pY + 16);
            ctx.globalAlpha = 1.0;
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, width, height);
        
        gridOffset -= 0.5;
        drawGrid();
        
        // Update candles
        for (let i = 0; i < candles.length; i++) {
            candles[i].x -= 0.5; 
        }
        
        if (candles[0] && candles[0].x < -spacing) {
            candles.shift();
            let lastCandle = candles[candles.length - 1];
            let open = lastCandle.close;
            let change = (Math.random() - 0.5) * 40;
            
            if (open < height * 0.2) change = Math.abs(change);
            if (open > height * 0.8) change = -Math.abs(change);
            
            let close = open + change;
            let high = Math.max(open, close) + Math.random() * 20;
            let low = Math.min(open, close) - Math.random() * 20;
            
            candles.push({ open, close, high, low, x: lastCandle.x + spacing });
        }
        
        // Draw candles
        candles.forEach(c => {
            const isUp = c.close <= c.open;
            const color = isUp ? 'rgba(0, 255, 204, 0.4)' : 'rgba(255, 71, 87, 0.4)';
            const hoverColor = isUp ? 'rgba(0, 255, 204, 1)' : 'rgba(255, 71, 87, 1)';
            
            let dist = Math.abs(mouse.x - c.x);
            let isActive = dist < 40;
            
            ctx.strokeStyle = isActive ? hoverColor : color;
            ctx.fillStyle = isActive ? hoverColor : color;
            
            ctx.beginPath();
            ctx.moveTo(c.x, c.high);
            ctx.lineTo(c.x, c.low);
            ctx.stroke();
            
            let bodyY = Math.min(c.open, c.close);
            let bodyHeight = Math.max(Math.abs(c.close - c.open), 2);
            ctx.fillRect(c.x - candleWidth/2, bodyY, candleWidth, bodyHeight);
            
            if (isActive) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = hoverColor;
                ctx.fillRect(c.x - candleWidth/2, bodyY, candleWidth, bodyHeight);
                ctx.shadowBlur = 0;
                
                ctx.beginPath();
                ctx.moveTo(c.x, bodyY);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.stroke();
            }
        });
        
        drawFloatingTickers();
        
        requestAnimationFrame(animate);
    }
    
    resize();
    animate();
};

document.addEventListener('DOMContentLoaded', () => {
    initStockBackground();
});

// Chart Instances
let histChart = null;
let predChart = null;

// Handle Form Submission
document.getElementById('prediction-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const ticker = document.getElementById('ticker-input').value.trim();
    const btn = document.getElementById('predict-btn');
    const btnText = btn.querySelector('.btn-text');
    const spinner = btn.querySelector('.spinner');
    const errorMsg = document.getElementById('error-message');
    const resultsSection = document.getElementById('results-section');
    
    if (!ticker) return;

    // UI Loading State
    btn.disabled = true;
    btnText.classList.add('hidden');
    spinner.classList.remove('hidden');
    errorMsg.classList.add('hidden');
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ticker: ticker })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch prediction');
        }
        
        // Update Stats
        document.getElementById('rmse-value').innerText = data.rmse.toFixed(2);
        document.getElementById('ticker-display').innerText = data.ticker.toUpperCase();
        document.getElementById('accuracy-value').innerText = data.total_accuracy.toFixed(2) + '%';
        
        // Show Results
        resultsSection.classList.remove('hidden');
        
        // Render Charts
        renderHistoricalChart(data.dates, data.historical_prices, data.ticker);
        renderPredictionChart(data.test_dates, data.actual_test_prices, data.predicted_prices, data.ticker);
        
        // Render Tables
        renderDataTables(data.yearly_data, data.monthly_data);
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
        errorMsg.innerText = err.message;
        errorMsg.classList.remove('hidden');
        resultsSection.classList.add('hidden');
    } finally {
        // Reset UI
        btn.disabled = false;
        btnText.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
});

// Chart.js Default Config for Dark Theme
Chart.defaults.color = '#a0aab2';
Chart.defaults.font.family = "'Outfit', sans-serif";

function renderHistoricalChart(dates, prices, ticker) {
    const ctx = document.getElementById('historicalChart').getContext('2d');
    
    if (histChart) {
        histChart.destroy();
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 255, 204, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 255, 204, 0.0)');

    histChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: `${ticker.toUpperCase()} Closing Price`,
                data: prices,
                borderColor: '#00ffcc',
                backgroundColor: gradient,
                borderWidth: 2,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#00ffcc',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: { 
                    grid: { display: false, drawBorder: false },
                    ticks: { maxTicksLimit: 8 }
                },
                y: { 
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function renderPredictionChart(dates, actual, predicted, ticker) {
    const ctx = document.getElementById('predictionChart').getContext('2d');
    
    if (predChart) {
        predChart.destroy();
    }

    predChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Actual Price',
                    data: actual,
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    tension: 0.1
                },
                {
                    label: 'Predicted Price',
                    data: predicted,
                    borderColor: '#7000ff',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: { color: '#fff', usePointStyle: true }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1
                }
            },
            scales: {
                x: { 
                    grid: { display: false, drawBorder: false },
                    ticks: { maxTicksLimit: 8 }
                },
                y: { 
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function renderDataTables(yearlyData, monthlyData) {
    const yearlyTableBody = document.querySelector('#yearly-table tbody');
    const monthlyTableBody = document.querySelector('#monthly-table tbody');
    
    yearlyTableBody.innerHTML = '';
    monthlyTableBody.innerHTML = '';

    if (yearlyData) {
        yearlyData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.period}</td>
                <td>₹${row.actual.toFixed(2)}</td>
                <td>₹${row.predicted.toFixed(2)}</td>
                <td class="${row.accuracy > 90 ? 'text-success' : 'text-warning'}">${row.accuracy.toFixed(2)}%</td>
            `;
            yearlyTableBody.appendChild(tr);
        });
    }

    if (monthlyData) {
        monthlyData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${row.period}</td>
                <td>₹${row.actual.toFixed(2)}</td>
                <td>₹${row.predicted.toFixed(2)}</td>
                <td class="${row.accuracy > 90 ? 'text-success' : 'text-warning'}">${row.accuracy.toFixed(2)}%</td>
            `;
            monthlyTableBody.appendChild(tr);
        });
    }
}
