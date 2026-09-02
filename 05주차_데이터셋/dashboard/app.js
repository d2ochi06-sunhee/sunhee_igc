// Application Logic for 따릉이 서울 로컬 지도 대시보드
document.addEventListener('DOMContentLoaded', () => {
  if (typeof STATIONS_DATA === 'undefined' || !Array.isArray(STATIONS_DATA)) {
    console.error('STATIONS_DATA is missing or invalid.');
    alert('데이터를 로드하는 데 실패했습니다.');
    return;
  }

  const stations = STATIONS_DATA;
  let activeFilter = { type: 'all' }; // { type: 'all' } | { type: 'cell', cnt: 0..3, ratio: 0..3 } | { type: 'row', cnt: 0..3 } | { type: 'col', ratio: 0..3 }
  let searchQuery = '';

  // Update total station counter in header
  const totalCountEl = document.getElementById('stat-total-count');
  const totalUsageEl = document.getElementById('stat-total-usage');
  
  if (totalCountEl) totalCountEl.textContent = stations.length.toLocaleString() + ' 곳';
  
  const grandTotalUsage = stations.reduce((acc, curr) => acc + (curr['전체 이용건수'] || 0), 0);
  if (totalUsageEl) totalUsageEl.textContent = grandTotalUsage.toLocaleString() + ' 건';

  // --- Dynamic Weighted Clustering (K-Means in JS) ---

  // 1. Calculate Mean and Standard Deviation for StandardScaler in JS
  function computeStandardScalerParams(data, key) {
    const vals = data.map(d => parseFloat(d[key]) || 0);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    const std = Math.sqrt(variance) || 1e-6;
    return { mean, std };
  }

  const morningStats = computeStandardScalerParams(stations, '평일출근비중');
  const eveningStats = computeStandardScalerParams(stations, '평일퇴근비중');
  const weekendStats = computeStandardScalerParams(stations, '주말비중');

  // K-Means Algorithm implementation in JavaScript
  function runWeightedKMeansJS(weights) {
    // weights = [w_morning, w_evening, w_weekend]
    const totalW = (weights[0] + weights[1] + weights[2]) || 1;
    const wNorm = [weights[0] / totalW, weights[1] / totalW, weights[2] / totalW];

    // Prepare scaled & weighted feature vectors for each station
    const featureVectors = stations.map(st => {
      const zMorning = ((parseFloat(st['평일출근비중']) || 0) - morningStats.mean) / morningStats.std;
      const zEvening = ((parseFloat(st['평일퇴근비중']) || 0) - eveningStats.mean) / eveningStats.std;
      const zWeekend = ((parseFloat(st['주말비중']) || 0) - weekendStats.mean) / weekendStats.std;

      return [
        zMorning * wNorm[0] * 3,
        zEvening * wNorm[1] * 3,
        zWeekend * wNorm[2] * 3
      ];
    });

    const k = 4;
    // Deterministic Initial Centroids for Reproducibility
    let centroids = [];
    centroids.push([...featureVectors[0]]);
    for (let c = 1; c < k; c++) {
      let maxDist = -1;
      let bestIdx = 0;
      for (let i = 0; i < featureVectors.length; i++) {
        let minDist = Infinity;
        for (let j = 0; j < centroids.length; j++) {
          let dist = (featureVectors[i][0] - centroids[j][0]) ** 2 +
                     (featureVectors[i][1] - centroids[j][1]) ** 2 +
                     (featureVectors[i][2] - centroids[j][2]) ** 2;
          if (dist < minDist) minDist = dist;
        }
        if (minDist > maxDist) {
          maxDist = minDist;
          bestIdx = i;
        }
      }
      centroids.push([...featureVectors[bestIdx]]);
    }

    let labels = new Array(featureVectors.length).fill(0);
    const maxIter = 40;

    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      for (let i = 0; i < featureVectors.length; i++) {
        let minDist = Infinity;
        let bestCluster = 0;
        for (let c = 0; c < k; c++) {
          let dist = (featureVectors[i][0] - centroids[c][0]) ** 2 +
                     (featureVectors[i][1] - centroids[c][1]) ** 2 +
                     (featureVectors[i][2] - centroids[c][2]) ** 2;
          if (dist < minDist) {
            minDist = dist;
            bestCluster = c;
          }
        }
        if (labels[i] !== bestCluster) {
          labels[i] = bestCluster;
          changed = true;
        }
      }

      if (!changed) break;

      // Update Centroids
      let sums = Array.from({ length: k }, () => [0, 0, 0]);
      let counts = new Array(k).fill(0);

      for (let i = 0; i < featureVectors.length; i++) {
        let c = labels[i];
        counts[c]++;
        sums[c][0] += featureVectors[i][0];
        sums[c][1] += featureVectors[i][1];
        sums[c][2] += featureVectors[i][2];
      }

      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          centroids[c][0] = sums[c][0] / counts[c];
          centroids[c][1] = sums[c][1] / counts[c];
          centroids[c][2] = sums[c][2] / counts[c];
        }
      }
    }

    // Assign labels back to stations
    stations.forEach((st, idx) => {
      st['군집_이용비중'] = labels[idx];
    });

    updateCrosstabUI();
  }

  // Populate 4x4 Crosstab Cell Counts from STATIONS_DATA
  function updateCrosstabUI() {
    const crosstabCounts = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    stations.forEach(st => {
      const cntClust = parseInt(st['군집_이용건수']);
      const ratioClust = parseInt(st['군집_이용비중']);
      if (!isNaN(cntClust) && !isNaN(ratioClust) && cntClust >= 0 && cntClust < 4 && ratioClust >= 0 && ratioClust < 4) {
        crosstabCounts[cntClust][ratioClust]++;
      }
    });

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const cellEl = document.getElementById(`cell-${r}-${c}`);
        if (cellEl) {
          const val = crosstabCounts[r][c];
          cellEl.textContent = val;
          if (val === 0) cellEl.classList.add('empty');
          else cellEl.classList.remove('empty');
        }
      }
    }
  }

  updateCrosstabUI();

  // Initialize Leaflet Map
  const map = L.map('map', {
    center: [37.5665, 126.9780],
    zoom: 11,
    zoomControl: false
  });

  L.control.zoom({ position: 'topright' }).addTo(map);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  const markersCluster = L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    maxClusterRadius: 50
  });

  const markerMap = new Map();

  function formatPct(val) {
    if (typeof val !== 'number') return '0.00%';
    const pct = val > 1 ? val : val * 100;
    return pct.toFixed(2) + '%';
  }

  function getMarkerColor(usage) {
    if (usage >= 100000) return '#f43f5e'; // Super (Red)
    if (usage >= 50000)  return '#f59e0b'; // High (Amber)
    if (usage >= 20000)  return '#06b6d4'; // Medium (Cyan)
    return '#3b82f6'; // Normal (Blue)
  }

  // Render Filtered Markers
  function renderMarkers() {
    markersCluster.clearLayers();
    markerMap.clear();

    const filtered = stations.filter(st => {
      // 1. Search Filter
      const name = String(st['대여소명'] || '').toLowerCase();
      const id = String(st['대여소번호'] || '');
      const matchSearch = !searchQuery || name.includes(searchQuery) || id.includes(searchQuery);
      if (!matchSearch) return false;

      // 2. Crosstab Filter
      const cntClust = parseInt(st['군집_이용건수']);
      const ratioClust = parseInt(st['군집_이용비중']);

      if (activeFilter.type === 'cell') {
        return cntClust === activeFilter.cnt && ratioClust === activeFilter.ratio;
      }
      if (activeFilter.type === 'row') {
        return cntClust === activeFilter.cnt;
      }
      if (activeFilter.type === 'col') {
        return ratioClust === activeFilter.ratio;
      }

      return true; // 'all'
    });

    filtered.forEach(st => {
      const lat = parseFloat(st['위도']);
      const lng = parseFloat(st['경도']);

      if (isNaN(lat) || isNaN(lng)) return;

      const color = getMarkerColor(st['전체 이용건수'] || 0);

      const circleMarker = L.circleMarker([lat, lng], {
        radius: (st['전체 이용건수'] || 0) >= 100000 ? 9 : 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.85
      });

      const popupHtml = `
        <div class="popup-card">
          <h4>${st['대여소명']}</h4>
          <div class="usage"><i class="fa-solid fa-bicycle"></i> 전체 이용: ${(st['전체 이용건수'] || 0).toLocaleString()}건</div>
          <div class="ratios">
            <span>🌅 출근비중: <strong>${formatPct(st['평일출근비중'])}</strong></span>
            <span><ctrl42> 퇴근비중: <strong>${formatPct(st['평일퇴근비중'])}</strong></span>
            <span>🎡 주말비중: <strong>${formatPct(st['주말비중'])}</strong></span>
          </div>
        </div>
      `;

      circleMarker.bindPopup(popupHtml, { closeButton: false });

      circleMarker.on('click', () => {
        selectStation(st, circleMarker);
      });

      markersCluster.addLayer(circleMarker);
      markerMap.set(st['대여소번호'], circleMarker);
    });

    map.addLayer(markersCluster);

    // Update Filtered Count Badge
    const badgeEl = document.getElementById('filtered-count-badge');
    if (badgeEl) badgeEl.textContent = `${filtered.length.toLocaleString()}곳 표시 중`;

    updateTopList(filtered);
  }

  // Show Station Detail Card
  function selectStation(st, marker = null) {
    const detailContainer = document.getElementById('detail-card-container');
    if (!detailContainer) return;

    const morningPct = (st['평일출근비중'] > 1 ? st['평일출근비중'] : st['평일출근비중'] * 100).toFixed(2);
    const eveningPct = (st['평일퇴근비중'] > 1 ? st['평일퇴근비중'] : st['평일퇴근비중'] * 100).toFixed(2);
    const weekendPct = (st['주말비중'] > 1 ? st['주말비중'] : st['주말비중'] * 100).toFixed(2);

    detailContainer.innerHTML = `
      <div class="detail-card">
        <div class="detail-header">
          <div class="station-id">STATION #${st['대여소번호']}</div>
          <h2>${st['대여소명']}</h2>
        </div>

        <div class="badges-row">
          <span class="badge badge-count">건수군집: ${st['군집_이용건수'] ?? '-'}</span>
          <span class="badge badge-ratio">비중군집: ${st['군집_이용비중'] ?? '-'}</span>
        </div>

        <div class="metrics-grid">
          <div class="metric-box">
            <span class="label">전체 이용건수</span>
            <span class="val">${(st['전체 이용건수'] || 0).toLocaleString()}</span>
          </div>
          <div class="metric-box">
            <span class="label">평일출근 건수</span>
            <span class="val">${(st['평일출근이용건수'] || 0).toLocaleString()}</span>
          </div>
          <div class="metric-box">
            <span class="label">평일퇴근 건수</span>
            <span class="val">${(st['평일퇴근이용건수'] || 0).toLocaleString()}</span>
          </div>
          <div class="metric-box">
            <span class="label">주말 이용건수</span>
            <span class="val">${(st['주말이용건수'] || 0).toLocaleString()}</span>
          </div>
        </div>

        <div class="ratio-section">
          <div class="ratio-item">
            <div class="ratio-label-row">
              <span class="name">🌅 평일 출근 비중 (7~9시)</span>
              <span class="pct">${morningPct}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill morning" style="width: ${Math.min(100, morningPct * 2)}%"></div>
            </div>
          </div>

          <div class="ratio-item">
            <div class="ratio-label-row">
              <span class="name">🌆 평일 퇴근 비중 (17~19시)</span>
              <span class="pct">${eveningPct}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill evening" style="width: ${Math.min(100, eveningPct * 2)}%"></div>
            </div>
          </div>

          <div class="ratio-item">
            <div class="ratio-label-row">
              <span class="name">🎡 주말 이용 비중</span>
              <span class="pct">${weekendPct}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill weekend" style="width: ${Math.min(100, weekendPct * 2)}%"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    const lat = parseFloat(st['위도']);
    const lng = parseFloat(st['경도']);
    if (!isNaN(lat) && !isNaN(lng)) {
      map.flyTo([lat, lng], 15, { duration: 1.2 });
      if (marker) {
        markersCluster.zoomToShowLayer(marker, () => {
          marker.openPopup();
        });
      }
    }
  }

  // Update Top 10 Ranking
  function updateTopList(filteredList) {
    const topContainer = document.getElementById('top-items-container');
    if (!topContainer) return;

    const top10 = [...filteredList]
      .sort((a, b) => (b['전체 이용건수'] || 0) - (a['전체 이용건수'] || 0))
      .slice(0, 10);

    if (top10.length === 0) {
      topContainer.innerHTML = `<div style="color:var(--text-muted); padding:10px; text-align:center;">선택된 조건의 대여소가 없습니다.</div>`;
      return;
    }

    topContainer.innerHTML = top10.map((st, idx) => `
      <div class="top-item" data-id="${st['대여소번호']}">
        <div class="top-item-left">
          <span class="rank-num">${idx + 1}</span>
          <span class="top-item-name" title="${st['대여소명']}">${st['대여소명']}</span>
        </div>
        <span class="top-item-val">${(st['전체 이용건수'] || 0).toLocaleString()}건</span>
      </div>
    `).join('');

    topContainer.querySelectorAll('.top-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = parseInt(item.getAttribute('data-id'));
        const st = stations.find(s => s['대여소번호'] === id);
        const marker = markerMap.get(id);
        if (st) selectStation(st, marker);
      });
    });
  }

  // Clear Active Styles in Crosstab Table
  function clearCrosstabActiveStates() {
    document.querySelectorAll('.crosstab-cell, .crosstab-row-header, .crosstab-col-header').forEach(el => {
      el.classList.remove('active');
    });
    const btnReset = document.getElementById('btn-reset-filter');
    if (btnReset) btnReset.classList.remove('active');
  }

  // 16 Crosstab Cell Click Handlers
  document.querySelectorAll('.crosstab-cell').forEach(cell => {
    cell.addEventListener('click', () => {
      const cnt = parseInt(cell.getAttribute('data-cnt'));
      const ratio = parseInt(cell.getAttribute('data-ratio'));

      if (isNaN(cnt) || isNaN(ratio)) return;

      clearCrosstabActiveStates();
      cell.classList.add('active');

      activeFilter = { type: 'cell', cnt, ratio };
      renderMarkers();
    });
  });

  // Row Header Click Handlers (Select all in Row)
  document.querySelectorAll('.crosstab-row-header').forEach(rowHeader => {
    rowHeader.addEventListener('click', () => {
      const cnt = parseInt(rowHeader.getAttribute('data-row'));
      if (isNaN(cnt)) return;

      clearCrosstabActiveStates();
      rowHeader.classList.add('active');

      activeFilter = { type: 'row', cnt };
      renderMarkers();
    });
  });

  // Col Header Click Handlers (Select all in Col)
  document.querySelectorAll('.crosstab-col-header').forEach(colHeader => {
    colHeader.addEventListener('click', () => {
      const ratio = parseInt(colHeader.getAttribute('data-col'));
      if (isNaN(ratio)) return;

      clearCrosstabActiveStates();
      colHeader.classList.add('active');

      activeFilter = { type: 'col', ratio };
      renderMarkers();
    });
  });

  // Reset Button Handler ("전체 보기")
  const btnReset = document.getElementById('btn-reset-filter');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      clearCrosstabActiveStates();
      btnReset.classList.add('active');
      activeFilter = { type: 'all' };
      renderMarkers();
    });
  }

  // Search Input Handler
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderMarkers();
    });
  }

  // Weight Sliders UI Handlers
  const sMorning = document.getElementById('slider-w-morning');
  const sEvening = document.getElementById('slider-w-evening');
  const sWeekend = document.getElementById('slider-w-weekend');

  const valMorning = document.getElementById('val-w-morning');
  const valEvening = document.getElementById('val-w-evening');
  const valWeekend = document.getElementById('val-w-weekend');

  function updateSliderDisplay() {
    if (valMorning) valMorning.textContent = `${sMorning.value}%`;
    if (valEvening) valEvening.textContent = `${sEvening.value}%`;
    if (valWeekend) valWeekend.textContent = `${sWeekend.value}%`;
  }

  if (sMorning && sEvening && sWeekend) {
    [sMorning, sEvening, sWeekend].forEach(slider => {
      slider.addEventListener('input', updateSliderDisplay);
    });
  }

  const btnRecluster = document.getElementById('btn-recluster');
  if (btnRecluster) {
    btnRecluster.addEventListener('click', () => {
      const wMorning = parseFloat(sMorning.value) || 0;
      const wEvening = parseFloat(sEvening.value) || 0;
      const wWeekend = parseFloat(sWeekend.value) || 0;

      btnRecluster.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> 재계산 중...`;

      setTimeout(() => {
        runWeightedKMeansJS([wMorning, wEvening, wWeekend]);
        renderMarkers();
        btnRecluster.innerHTML = `<i class="fa-solid fa-arrows-rotate"></i> 가중치 반영해 다시 묶기`;
      }, 50);
    });
  }

  // Initial Render
  renderMarkers();
});
