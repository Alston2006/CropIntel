/**
 * Market Pulse Engine — Client
 * Real-time commodity dashboard with Chart.js visualizations,
 * auto-refresh, and Gemini AI insight loading.
 */

(() => {
    "use strict";

    // ─── Config ───
    const API_BASE = "http://127.0.0.1:8001/api/market";
    const REFRESH_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

    // ─── State ───
    let allCrops = [];
    let selectedCrop = null;
    let priceChart = null;
    let chartRange = 7;

    // ─── DOM references ───
    const $tickerTrack = document.getElementById("tickerTrack");
    const $cropGrid = document.getElementById("cropGrid");
    const $statTotalCrops = document.getElementById("statTotalCrops");
    const $statUp = document.getElementById("statUp");
    const $statDown = document.getElementById("statDown");
    const $statAnomalies = document.getElementById("statAnomalies");
    const $chartTitle = document.getElementById("chartTitle");
    const $lastUpdate = document.getElementById("lastUpdate");
    const $detailPlaceholder = document.getElementById("detailPlaceholder");
    const $detailContent = document.getElementById("detailContent");
    const $anomalyList = document.getElementById("anomalyList");

    // ─── Helpers ───
    function trendArrow(trend) {
        if (trend === "UP") return "▲";
        if (trend === "DOWN") return "▼";
        return "●";
    }

    function trendClass(trend) {
        return (trend || "STABLE").toLowerCase();
    }

    function formatPrice(val) {
        return "₹" + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 0 });
    }

    function formatChange(val) {
        const sign = val > 0 ? "+" : "";
        return sign + Number(val).toFixed(2) + "%";
    }

    function timeAgo() {
        return new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    }

    // ─── 1. Load Market Data ───
    async function loadMarketData() {
        try {
            const res = await fetch(`${API_BASE}/latest`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            allCrops = await res.json();
            renderStats();
            renderTicker();
            renderCropGrid();
            renderAnomalies();
            $lastUpdate.textContent = `Updated ${timeAgo()}`;
        } catch (err) {
            console.error("[Market] loadMarketData failed:", err);
            $cropGrid.innerHTML = `<p style="color:var(--red);padding:2rem;">Failed to load market data. Is the backend running on port 8001?</p>`;
        }
    }

    // ─── 2. Render Stats ───
    function renderStats() {
        const unique = [...new Set(allCrops.map(c => c.crop))];
        const upCount = allCrops.filter(c => c.trend === "UP").length;
        const downCount = allCrops.filter(c => c.trend === "DOWN").length;
        const anomalyCount = allCrops.filter(c => c.is_anomaly).length;

        $statTotalCrops.textContent = unique.length;
        $statUp.textContent = upCount;
        $statDown.textContent = downCount;
        $statAnomalies.textContent = anomalyCount;
    }

    // ─── 3. Render Ticker ───
    function renderTicker() {
        // De-duplicate by crop name (take first)
        const seen = new Set();
        const tickerItems = allCrops.filter(c => {
            if (seen.has(c.crop)) return false;
            seen.add(c.crop);
            return true;
        });

        // Double for infinite scroll effect
        const html = [...tickerItems, ...tickerItems].map(c => `
            <div class="ticker-item" onclick="window._selectCrop('${c.crop.replace(/'/g, "\\'")}')">
                <span class="crop-name">${c.crop}</span>
                <span class="price-val">${formatPrice(c.price)}</span>
                <span class="change ${trendClass(c.trend)}">${trendArrow(c.trend)} ${formatChange(c.change_percent)}</span>
            </div>
        `).join("");

        $tickerTrack.innerHTML = html;
    }

    // ─── 4. Render Crop Grid ───
    function renderCropGrid() {
        // De-duplicate — show one card per crop+location
        const html = allCrops.map(c => {
            const tc = trendClass(c.trend);
            const activeClass = selectedCrop === c.crop ? "active" : "";
            return `
                <div class="crop-card ${tc} ${activeClass}"
                     onclick="window._selectCrop('${c.crop.replace(/'/g, "\\'")}')">
                    <div class="crop-card-top">
                        <div>
                            <div class="crop-name">${c.crop}</div>
                            <div class="crop-location">${c.market || c.location}, ${c.state || ""}</div>
                        </div>
                        <span class="crop-trend-badge ${tc}">${trendArrow(c.trend)} ${c.trend}</span>
                    </div>
                    <div class="crop-card-price">${formatPrice(c.price)}</div>
                    <div class="crop-card-change ${tc}">${formatChange(c.change_percent)}</div>
                    <div class="crop-card-footer">
                        <span>Min: ${formatPrice(c.min_price)}</span>
                        <span>Max: ${formatPrice(c.max_price)}</span>
                        ${c.is_anomaly ? '<span><span class="anomaly-dot"></span> Anomaly</span>' : ""}
                    </div>
                </div>
            `;
        }).join("");

        $cropGrid.innerHTML = html;
    }

    // ─── 5. Render Anomalies ───
    function renderAnomalies() {
        const anomalies = allCrops.filter(c => c.is_anomaly);
        if (anomalies.length === 0) {
            $anomalyList.innerHTML = `
                <div class="no-anomalies">
                    <div class="icon">✅</div>
                    <p>No anomalies detected</p>
                </div>`;
            return;
        }

        $anomalyList.innerHTML = anomalies.map(a => `
            <div class="anomaly-item">
                <span class="anomaly-dot"></span>
                <span class="crop">${a.crop}</span>
                <span class="z-val">Z&gt;2</span>
                <span class="price">${formatPrice(a.price)}</span>
            </div>
        `).join("");
    }

    // ─── 6. Select Crop → Load Detail + Chart ───
    window._selectCrop = async function (crop) {
        selectedCrop = crop;
        renderCropGrid(); // Re-render to highlight active

        // Show detail panel
        $detailPlaceholder.style.display = "none";
        $detailContent.classList.add("active");

        // Set crop name
        document.getElementById("detailCropName").textContent = crop;

        // Find latest entry for this crop
        const entry = allCrops.find(c => c.crop === crop);
        if (entry) {
            const tc = trendClass(entry.trend);
            document.getElementById("detailTrendBadge").textContent = `${trendArrow(entry.trend)} ${entry.trend}`;
            document.getElementById("detailTrendBadge").className = `crop-trend-badge ${tc}`;
            document.getElementById("detailPrice").textContent = formatPrice(entry.price);
            document.getElementById("detailChange").textContent = formatChange(entry.change_percent);
            document.getElementById("detailChange").style.color = entry.trend === "UP" ? "var(--green)" : entry.trend === "DOWN" ? "var(--red)" : "var(--text-muted)";
            document.getElementById("detailMin").textContent = formatPrice(entry.min_price);
            document.getElementById("detailMax").textContent = formatPrice(entry.max_price);
        }

        // Load prediction + chart + insight concurrently
        loadPrediction(crop);
        loadCropHistory(crop);
        loadInsight(crop);
    };

    // ─── 7. Load Crop History + Render Chart ───
    async function loadCropHistory(crop) {
        $chartTitle.textContent = `Price Trend — ${crop}`;
        try {
            const res = await fetch(`${API_BASE}/prediction/${crop}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            const historical = data.historicalPrices || [];
            const predicted = data.trend || [];
            renderChart(crop, historical, predicted);
        } catch (err) {
            console.error("[Market] loadCropHistory failed:", err);
        }
    }

    // ─── 8. Render Chart ───
    function renderChart(crop, historicalPrices, predictedPrices) {
        const ctx = document.getElementById("priceChart").getContext("2d");

        if (priceChart) {
            priceChart.destroy();
        }

        // Trim to chart range
        const sliced = historicalPrices.slice(-chartRange);
        const labels = sliced.map((_, i) => `Day ${i + 1}`);
        const predictLabels = predictedPrices.map((_, i) => `+${i + 1}D`);

        // Combine for display
        const allLabels = [...labels, ...predictLabels];
        const histData = [...sliced, ...new Array(predictedPrices.length).fill(null)];
        const predData = [...new Array(sliced.length - 1).fill(null), sliced[sliced.length - 1] || 0, ...predictedPrices];

        priceChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: allLabels,
                datasets: [
                    {
                        label: `${crop} — Historical`,
                        data: histData,
                        borderColor: "#448aff",
                        backgroundColor: "rgba(68, 138, 255, 0.08)",
                        borderWidth: 2.5,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                        pointBackgroundColor: "#448aff",
                        pointBorderColor: "#111827",
                        pointBorderWidth: 2,
                    },
                    {
                        label: `${crop} — Predicted`,
                        data: predData,
                        borderColor: "#00e676",
                        backgroundColor: "rgba(0, 230, 118, 0.06)",
                        borderWidth: 2,
                        borderDash: [6, 4],
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                        pointBackgroundColor: "#00e676",
                        pointBorderColor: "#111827",
                        pointBorderWidth: 2,
                    }
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false,
                },
                plugins: {
                    legend: {
                        labels: {
                            color: "#9aa0a6",
                            font: { family: "'Inter', sans-serif", size: 12 },
                            usePointStyle: true,
                            pointStyle: "circle",
                        },
                    },
                    tooltip: {
                        backgroundColor: "#1a1f2e",
                        titleColor: "#e8eaed",
                        bodyColor: "#9aa0a6",
                        borderColor: "#2a2f3e",
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        callbacks: {
                            label: ctx => ctx.parsed.y !== null ? `${ctx.dataset.label}: ₹${ctx.parsed.y.toLocaleString()}` : null,
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: { color: "#5f6368", font: { size: 11 } },
                        grid: { color: "rgba(42, 47, 62, 0.5)", drawBorder: false },
                    },
                    y: {
                        ticks: {
                            color: "#5f6368",
                            font: { size: 11 },
                            callback: val => "₹" + val.toLocaleString(),
                        },
                        grid: { color: "rgba(42, 47, 62, 0.5)", drawBorder: false },
                    },
                },
            },
        });
    }

    // ─── 9. Load Prediction ───
    async function loadPrediction(crop) {
        const $predicted = document.getElementById("detailPredicted");
        const $confidence = document.getElementById("detailConfidence");
        const $rec = document.getElementById("detailRecommendation");

        $predicted.textContent = "...";
        $confidence.textContent = "...";
        $rec.textContent = "Loading...";
        $rec.className = "recommendation-badge wait";

        try {
            const res = await fetch(`${API_BASE}/prediction/${crop}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();

            $predicted.textContent = formatPrice(data.predictedPrice);
            $confidence.textContent = (data.confidence * 100).toFixed(0) + "%";

            const rec = data.recommendation;
            $rec.textContent = `${rec === "SELL" ? "🔴" : rec === "HOLD" ? "🟡" : "🔵"} ${rec}`;
            $rec.className = `recommendation-badge ${rec.toLowerCase()}`;
        } catch (err) {
            console.error("[Market] loadPrediction failed:", err);
            $predicted.textContent = "N/A";
            $confidence.textContent = "N/A";
            $rec.textContent = "Unavailable";
        }
    }

    // ─── 10. Load Gemini Insight ───
    async function loadInsight(crop) {
        const $insight = document.getElementById("detailInsight");
        $insight.innerHTML = `<div class="insight-loading"><div class="spinner"></div>Analyzing ${crop} with Gemini AI...</div>`;

        try {
            const res = await fetch(`${API_BASE}/insight/${crop}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            $insight.textContent = data.insight || data.structured_summary;
        } catch (err) {
            console.error("[Market] loadInsight failed:", err);
            $insight.textContent = "AI insight unavailable. Check that GEMINI_API_KEY is set.";
        }
    }

    // ─── 11. Chart Range Switcher ───
    window.switchChartRange = function (days) {
        chartRange = days;
        document.querySelectorAll(".chart-btn").forEach(btn => {
            btn.classList.toggle("active", Number(btn.dataset.days) === days);
        });
        if (selectedCrop) {
            loadCropHistory(selectedCrop);
        }
    };

    // ─── 12. Refresh Data ───
    window.refreshData = async function () {
        const btn = document.getElementById("btnRefresh");
        btn.classList.add("loading");
        try {
            await fetch(`${API_BASE}/refresh`, { method: "POST" });
            await loadMarketData();
            if (selectedCrop) {
                window._selectCrop(selectedCrop);
            }
        } catch (err) {
            console.error("[Market] refresh failed:", err);
        } finally {
            btn.classList.remove("loading");
        }
    };

    // ─── Init ───
    loadMarketData();

    // Auto-refresh every 15 minutes
    setInterval(() => {
        console.log("[Market] Auto-refreshing data...");
        window.refreshData();
    }, REFRESH_INTERVAL_MS);

})();
