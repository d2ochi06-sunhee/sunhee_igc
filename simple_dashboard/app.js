// Data Values for Summary Dashboard
const DASHBOARD_DATA = {
    totalUsage: 2185124,     // 총 이용건수
    stationCount: 2804,       // 운영 대여소 수
    avgPerStation: 779.3      // 대여소당 평균 이용건수
};

// Count-up Number Animation
function animateValue(id, start, end, duration, isDecimal = false) {
    const obj = document.getElementById(id);
    if (!obj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Cubic Easing Out
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentVal = easeProgress * (end - start) + start;

        if (isDecimal) {
            obj.innerText = currentVal.toFixed(1);
        } else {
            obj.innerText = Math.floor(currentVal).toLocaleString('ko-KR');
        }

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            if (isDecimal) {
                obj.innerText = end.toFixed(1);
            } else {
                obj.innerText = end.toLocaleString('ko-KR');
            }
        }
    };
    window.requestAnimationFrame(step);
}

// Animate Progress Bars
function animateProgressBars() {
    const cyanFill = document.querySelector('.cyan-fill');
    const emeraldFill = document.querySelector('.emerald-fill');

    setTimeout(() => {
        if (cyanFill) cyanFill.style.width = '88%';
        if (emeraldFill) emeraldFill.style.width = '94%';
    }, 200);
}

// Update Header Date Tag
function updateCurrentDate() {
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        dateEl.innerText = `${year}.${month} 최신 현황`;
    }
}

// Initialize Dashboard
function initSummaryDashboard() {
    // 1. Trigger Counter Animations
    animateValue('total-usage', 0, DASHBOARD_DATA.totalUsage, 2000);
    animateValue('station-count', 0, DASHBOARD_DATA.stationCount, 1800);
    animateValue('avg-per-station', 0, DASHBOARD_DATA.avgPerStation, 2200, true);

    // 2. Animate Progress Bars
    animateProgressBars();

    // 3. Update Date
    updateCurrentDate();
}

// DOM Loaded Event listener
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSummaryDashboard);
} else {
    initSummaryDashboard();
}
