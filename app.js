document.addEventListener('DOMContentLoaded', () => {
    // Exact aggregated numbers from bike_station_hourly.csv
    const TOTAL_RENTALS = 41649637;
    const TOTAL_STATIONS = 2825;

    // Hourly distribution data (0 to 23 hours)
    const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}시`);
    const hourlyData = [
        803541, 561175, 378137, 276262, 238539, 470064,
        989391, 2263077, 3236294, 1852187, 1463265, 1658868,
        1801385, 1812774, 1859516, 2101214, 2553022, 3403323,
        4017557, 2762090, 2315545, 2088862, 1687743, 1055806
    ];

    // Day type data
    const weekdayRentals = 31414681;
    const weekendRentals = 10234956;

    // Counter Animation
    animateValue("totalRentals", 0, TOTAL_RENTALS, 2000);
    animateValue("totalStations", 0, TOTAL_STATIONS, 1500);

    function animateValue(id, start, end, duration) {
        const obj = document.getElementById(id);
        if (!obj) return;
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            // Ease out cubic
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentVal = Math.floor(easeProgress * (end - start) + start);
            obj.innerHTML = currentVal.toLocaleString('ko-KR');
            if (progress < 1) {
                window.requestAnimationFrame(step);
            } else {
                obj.innerHTML = end.toLocaleString('ko-KR');
            }
        };
        window.requestAnimationFrame(step);
    }

    // Chart.js Default Configs for Dark Mode
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Outfit', 'Noto Sans KR', sans-serif";

    // 1. Hourly Line/Area Chart
    const ctxHourly = document.getElementById('hourlyChart').getContext('2d');
    
    // Gradient fill for hourly chart
    const hourlyGradient = ctxHourly.createLinearGradient(0, 0, 0, 300);
    hourlyGradient.addColorStop(0, 'rgba(0, 217, 245, 0.45)');
    hourlyGradient.addColorStop(1, 'rgba(0, 217, 245, 0.0)');

    new Chart(ctxHourly, {
        type: 'line',
        data: {
            labels: hourlyLabels,
            datasets: [{
                label: '대여건수',
                data: hourlyData,
                borderColor: '#00D9F5',
                borderWidth: 3,
                backgroundColor: hourlyGradient,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 7,
                pointBackgroundColor: '#00D9F5',
                pointHoverBackgroundColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 12,
                    cornerRadius: 10,
                    borderColor: 'rgba(0, 217, 245, 0.3)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return ` 이용건수: ${context.parsed.y.toLocaleString('ko-KR')}건`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { font: { size: 11 } }
                },
                y: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        callback: function(value) {
                            return (value / 10000).toFixed(0) + '만건';
                        }
                    }
                }
            }
        }
    });

    // 2. Day Type Doughnut Chart
    const ctxDayType = document.getElementById('dayTypeChart').getContext('2d');
    new Chart(ctxDayType, {
        type: 'doughnut',
        data: {
            labels: ['평일', '주말'],
            datasets: [{
                data: [weekdayRentals, weekendRentals],
                backgroundColor: ['#00D9F5', '#00F5A0'],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    cornerRadius: 10,
                    callbacks: {
                        label: function(context) {
                            const val = context.parsed;
                            const total = weekdayRentals + weekendRentals;
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${context.label}: ${val.toLocaleString('ko-KR')}건 (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
});
