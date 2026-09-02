# 🚴 서울시 따릉이 대시보드 & 데이터 분석 (`dashboard_uac`)

서울시 공공자전거(따릉이) 이용 현황 분석, 대여소 군집화(Clustering) 및 위치 기반 지도 대시보드 프로젝트입니다.

---

## 📊 대시보드 핵심 현황 (KPI Summary)

| 🚲 총 누적 이용건수 | 📍 운영 대여소 수 | ⏰ 최다 이용 시간대 (피크) | 🗓️ 평일 이용 비중 |
| :---: | :---: | :---: | :---: |
| **41,649,637 건** | **2,825 개소** | **18시 (퇴근시간)** | **31,414,681 건 (75.4%)** |

> 🌐 **대시보드 웹사이트 접속**: [GitHub Pages 웹 대시보드 바로가기](https://d2ochi06.github.io/dashboard_uac/) *(GitHub Settings > Pages 활성화 후 접속 가능)*

---

## 📌 주요 특징
- **핵심 대시보드 가시화**: HTML5 / CSS3 / JavaScript / Chart.js 기반 4,165만 건의 실시간 데이터 가시화
- **대여소 프로필 분석**: 서울시 내 따릉이 대여소별 이용량 및 점수 산출 데이터 분석
- **군집화 & 지도 가시화**: K-Means 군집 분석을 적용하여 따릉이 운영 현황을 직관적인 웹 대시보드로 시각화
- **우선 관리 대여소 추출**: 출퇴근 시간대 및 월별 이용 패턴 기반 대여소 분석

---

## 📊 데이터셋 개요
| 데이터셋 파일 | 내용 요약 |
| :--- | :--- |
| `bike_station_hourly.csv` | 시간대별 따릉이 이용 패턴 데이터 (총 41,649,637건) |
| `bike_station_profile.csv` | 대여소 위치, 거치대 수, 이용 점수 프로필 (2,825개 대여소) |
| `bike_station_monthly.csv` | 월별 이용량 및 변동 추이 데이터 |
| `bike_cluster_summary.csv` | K-Means 군집화 결과 요약 정보 |

---

## 🛠 사용 기술
- **Data Processing**: Python, Pandas, Scikit-Learn (K-Means)
- **Web Dashboard**: HTML5, Vanilla CSS3, JavaScript (ES6+), Chart.js
