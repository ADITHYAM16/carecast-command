CARECAST AI - SYNTHETIC HOSPITAL DATASET
==============================================

All data in this package is synthetic and intended for hackathon/demo/educational use.
It does not represent real patients, hospitals, or clinical recommendations.

Files:
1. hospital_hourly_data.csv
   90 days x 24 hours of hospital-wide operational data.

2. resource_utilization_timeseries.csv
   Long-format hourly demand/capacity/utilization data for departments/resources.

3. resources.csv
   Resource master data and capacities.

4. dependencies.csv
   Department/resource dependency graph with dependency strengths.

5. scenarios.csv
   Preset what-if scenarios for the CareCast simulator.

6. forecast_training_data.csv
   Feature-engineered dataset with lag and rolling-window features for ML forecasting.

Suggested ML target:
- patient_arrivals (next hour)
- emergency_cases (next hour)
- diagnostic_requests (next hour)
- ct_requests (next hour)
- lab_requests (next hour)

Recommended derived metric:
utilization = predicted_demand / capacity * 100

Risk thresholds:
<70%   LOW
70-80% NORMAL
80-90% MODERATE
90-95% HIGH
>95%   CRITICAL
