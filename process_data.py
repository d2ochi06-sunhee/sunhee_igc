import pandas as pd
import os

# 1. Read dataset
input_path = '05주차_데이터셋/data/bike_station_hourly.csv'
df = pd.read_csv(input_path)

# 2. Add flags and weighted counts for condition filtering
df['is_weekday_morning'] = (df['요일유형'] == '평일') & (df['대여시간'].isin([7, 8, 9]))
df['is_weekday_evening'] = (df['요일유형'] == '평일') & (df['대여시간'].isin([17, 18, 19]))
df['is_weekend'] = (df['요일유형'] == '주말')

df['평일출근이용건수'] = df['이용건수'] * df['is_weekday_morning']
df['평일퇴근이용건수'] = df['이용건수'] * df['is_weekday_evening']
df['주말이용건수'] = df['이용건수'] * df['is_weekend']

# 3. Group by station and aggregate
agg = df.groupby(['대여소번호', '대여소명'], as_index=False).agg({
    '이용건수': 'sum',
    '평일출근이용건수': 'sum',
    '평일퇴근이용건수': 'sum',
    '주말이용건수': 'sum'
})

agg.rename(columns={'이용건수': '전체 이용건수'}, inplace=True)

# 4. Calculate ratios
agg['평일출근비중'] = agg['평일출근이용건수'] / agg['전체 이용건수']
agg['평일퇴근비중'] = agg['평일퇴근이용건수'] / agg['전체 이용건수']
agg['주말비중'] = agg['주말이용건수'] / agg['전체 이용건수']

# 5. Sort by overall usage count descending
agg = agg.sort_values(by='전체 이용건수', ascending=False).reset_index(drop=True)

# 6. Save to CSV files with utf-8-sig encoding
output_paths = [
    '05주차_데이터셋/data/bike_station_anlysis.csv',
    '05주차_데이터셋/data/bike_station_analysis.csv'
]

for out_path in output_paths:
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    agg.to_csv(out_path, index=False, encoding='utf-8-sig')

# Also handle potential '5주차_데이터셋' path if distinct directory is referenced
if not os.path.exists('5주차_데이터셋/data'):
    try:
        os.makedirs('5주차_데이터셋/data', exist_ok=True)
        agg.to_csv('5주차_데이터셋/data/bike_station_anlysis.csv', index=False, encoding='utf-8-sig')
    except Exception as e:
        print(f"Note: Could not create 5주차_데이터셋: {e}")

print("Saved successfully!")
print("\n--- 상위 5개 행 ---")
print(agg.head().to_string())
