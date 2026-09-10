# CareCast Command

Build a production-quality, highly polished frontend web application called:

CARECAST AI

Tagline:

"Predict. Prepare. Prevent."

============================================================

CORE PRODUCT CONCEPT

============================================================

CareCast AI is an intelligent hospital capacity intelligence and forecasting platform.

Hackathon Problem:

"Intelligent Hospital Resource Utilization and Capacity Forecasting"

The platform must:

1. Monitor current hospital resource utilization

2. Forecast future patient demand and resource utilization

3. Detect upcoming resource bottlenecks BEFORE congestion occurs

4. Model how shortages propagate between interconnected departments

5. Evaluate capacity-risk scenarios using what-if simulation

6. Provide explainable AI-powered operational recommendations

The product must communicate this core concept:

PREDICT → PROPAGATE → SIMULATE → ACT

The most important story of the application is:

CURRENT STATUS

      ↓

AI FORECAST

      ↓

PREDICTED BOTTLENECK

      ↓

PROPAGATION IMPACT

      ↓

AI RECOMMENDATION

      ↓

SCENARIO SIMULATION

      ↓

PREVENTIVE ACTION

============================================================

VERY IMPORTANT PRODUCT DIRECTION

============================================================

DO NOT turn this into a generic hospital management system.

This is NOT:

- Patient management software

- Appointment booking software

- Hospital billing software

- Doctor management software

- Generic CRUD dashboard

- Electronic medical record system

This IS:

An AI-powered hospital command center focused on:

- Predictive capacity intelligence

- Resource utilization

- Demand forecasting

- Bottleneck prediction

- Risk analysis

- Dependency propagation

- Scenario simulation

- Preventive recommendations

Every major UI decision should reinforce this concept.

The application should make a judge understand within 5 seconds:

"This system predicts hospital capacity problems BEFORE they happen and shows how those problems propagate through the hospital."

============================================================

TECH STACK

============================================================

Use:

- React

- Vite

- TypeScript

- Tailwind CSS

- shadcn/ui

- Recharts

- React Flow

- Lucide React

- Framer Motion

Frontend only.

Do NOT create a backend.

Create a clean service/API abstraction layer so the frontend can later connect to a FastAPI backend.

Use realistic deterministic mock JSON data.

Do NOT use random values that change on every refresh.

Architecture must be prepared for future API integration.

============================================================

DESIGN PHILOSOPHY

============================================================

The application should feel like:

"NATIONAL HOSPITAL OPERATIONS COMMAND CENTER

+

AI FORECASTING PLATFORM

+

MISSION CONTROL"

Visual inspiration:

- NASA mission control

- Modern medical AI systems

- Premium enterprise analytics

- Futuristic operations center

But maintain a serious healthcare/enterprise appearance.

Do NOT make it look like:

- A gaming dashboard

- Cyberpunk UI

- Generic SaaS template

- Basic Bootstrap dashboard

- Cartoon healthcare interface

============================================================

VISUAL THEME

============================================================

Use a sophisticated dark command-center theme.

Background:

Deep navy / midnight / blue-black.

Use subtle:

- radial gradients

- grid patterns

- glass panels

- thin borders

- ambient blue/cyan glow

- soft shadows

Accent language:

- Cyan/teal = AI / active / information

- Green = healthy / safe

- Amber = warning

- Red = critical

- White/light gray = primary information

Use red ONLY for genuine risk.

Do not make everything neon.

Glassmorphism should be subtle and professional.

Cards should have:

- rounded corners

- thin borders

- subtle depth

- clean spacing

- slight hover elevation

============================================================

TYPOGRAPHY

============================================================

Use:

Inter

Use strong hierarchy:

Large:

Hospital score

Critical percentage

Major forecast values

Medium:

Section headings

Small:

Metadata

Timestamps

Status labels

Use tabular/monospace styling for numerical metrics where appropriate.

============================================================

GLOBAL APPLICATION STRUCTURE

============================================================

Desktop-first responsive application.

Main structure:

LEFT SIDEBAR

+

TOP HEADER

+

MAIN CONTENT

Sidebar must be collapsible.

Brand:

CARECAST

AI

Logo:

Minimal pulse waveform combined with AI/network nodes.

Tagline:

Predict • Prepare • Prevent

============================================================

SIDEBAR NAVIGATION

============================================================

Navigation:

1. Command Center

2. Capacity Forecast

3. Bottlenecks

4. Dependency Network

5. Scenario Simulator

6. Resource Intelligence

7. Procedures & Scheduling

8. AI Recommendations

9. Reports

Bottom:

SYSTEM STATUS

● AI ENGINE OPERATIONAL

Then:

Admin Profile

============================================================

TOP HEADER

============================================================

Hospital:

Healthcare Support

Status:

● SYSTEM OPERATIONAL

Forecast Engine:

AI FORECAST ACTIVE

Current date/time

Notification icon

Admin profile

Add subtle animated pulse to system status.

============================================================

THE MOST IMPORTANT DESIGN PRINCIPLE

============================================================

MAKE THE COMMAND CENTER THE VISUAL CENTERPIECE.

The Command Center should NOT look like a collection of disconnected cards.

It must visually tell one continuous story:

                  CARECAST AI

                      │

                      ▼

             ┌─────────────────┐

             │ CURRENT STATUS  │

             │    78 / 100     │

             │  MODERATE RISK  │

             └────────┬────────┘

                      │

                      ▼

             ┌─────────────────┐

             │ AI FORECAST     │

             │                 │

             │ +6 HOURS        │

             │ 94% CAPACITY    │

             └────────┬────────┘

                      │

                      ▼

              🚨 BOTTLENECK

             EMERGENCY BEDS

                 97%

                      │

                      ▼

             PROPAGATION MAP

          ┌───────────┼───────────┐

          ▼           ▼           ▼

        CT          LAB          WARD

          │           │           │

          └───────────┼───────────┘

                      ▼

                 ICU PRESSURE

                      │

                      ▼

              AI RECOMMENDATION

                      │

                      ▼

              SCENARIO SIMULATOR

This conceptual flow should influence the actual visual hierarchy of the Command Center.

Do NOT simply create nine equal-sized dashboard cards.

The Command Center should feel like one intelligent decision-making workflow.

============================================================

COMMAND CENTER — PAGE 1

============================================================

This is the PRIMARY and most important page.

The first screen should be impressive within 5 seconds.

Title:

"Hospital Command Center"

Subtitle:

"Predictive capacity intelligence for proactive hospital operations"

Top-right:

LIVE

Last updated:

10 seconds ago

------------------------------------------------------------

SECTION 1 — HOSPITAL CAPACITY HEALTH

------------------------------------------------------------

Place this at the top.

Large premium hero card:

HOSPITAL CAPACITY HEALTH

78 / 100

MODERATE RISK

Use a large circular/radial visualization.

Show:

Current utilization:

78%

Predicted peak:

94%

Time to critical:

3h 12m

Add subtle animation.

Below or beside it show a compact AI message:

"Capacity pressure is increasing. AI forecasts elevated emergency demand within the next 6 hours."

------------------------------------------------------------

SECTION 2 — CRITICAL CAPACITY ALERT

------------------------------------------------------------

THIS MUST BE ONE OF THE MOST VISUALLY IMPRESSIVE ELEMENTS.

Do NOT create a boring red rectangle.

Create an intelligent warning panel with:

- subtle red ambient glow

- animated severity indicator

- vertical severity bar

- large resource icon

- current utilization

- predicted utilization

- countdown

- mini sparkline

- impact path

- recommended action

- action buttons

Header:

⚠ CRITICAL CAPACITY ALERT

Main:

Emergency Bed Capacity

Current:

88%

Forecast:

97%

Predicted overload:

2h 47m

Message:

"Emergency demand is projected to exceed available bed capacity."

Mini timeline:

NOW ───── +1H ───── +2H ───── +3H

Show forecast crossing critical threshold.

Impact:

Emergency → General Ward → ICU

Buttons:

VIEW IMPACT

SIMULATE RESPONSE

Secondary alerts:

CT Scanner

91%

HIGH

Critical in 4h 18m

General Ward

87%

HIGH

Critical in 6h 05m

Critical alerts should immediately attract attention without making the whole application visually aggressive.

------------------------------------------------------------

SECTION 3 — CAPACITY FORECAST

------------------------------------------------------------

This should occupy a large portion of the Command Center.

Title:

"Capacity Forecast"

Subtitle:

"AI prediction of hospital resource pressure"

Tabs:

6H

12H

24H

48H

Large interactive Recharts visualization.

Display:

Actual utilization

AI forecast

Confidence interval

Safe threshold

Critical threshold

The graph must visually show where forecast crosses the critical capacity line.

Example:

Current:

78%

+3 hours:

86%

+6 hours:

94%

+8 hours:

98%

Add a highlighted forecast crossing point:

"BOTTLENECK PREDICTED"

Tooltip:

Time

Resource

Current utilization

Predicted demand

Capacity remaining

Risk

------------------------------------------------------------

SECTION 4 — RESOURCE INTELLIGENCE

------------------------------------------------------------

Create six premium resource cards:

Emergency

Beds

ICU

CT

MRI

Laboratory

Each:

Icon

Utilization:

88%

Capacity:

44 / 50

Trend:

↑ +12%

Risk:

HIGH

Include miniature sparkline.

Do not make these cards visually dominate the forecast and alert.

------------------------------------------------------------

SECTION 5 — DEPARTMENT PRESSURE MAP

------------------------------------------------------------

Title:

"Department Pressure"

Create a visual grid:

Emergency

General Ward

ICU

Radiology

Laboratory

Operating Room

Cardiology

Pediatrics

Each tile:

Department name

Utilization

Risk

Trend

Statuses:

LOW

NORMAL

MODERATE

HIGH

CRITICAL

Clicking a department should open more details.

------------------------------------------------------------

SECTION 6 — AI OPERATIONAL INSIGHT

------------------------------------------------------------

Premium AI insight card.

Header:

✦ AI OPERATIONAL INSIGHT

Example:

"Emergency arrivals are increasing 18% faster than the normal hourly pattern. Bed utilization is expected to reach 95% within approximately 3 hours."

Then:

PRIMARY BOTTLENECK:

Emergency Beds

PREDICTED TIME:

2h 47m

RECOMMENDED PRIORITY:

Prepare 12 additional beds and redistribute non-urgent diagnostic procedures.

Buttons:

VIEW EXPLANATION

OPEN SIMULATOR

============================================================

COMMAND CENTER VISUAL HIERARCHY

============================================================

Use this approximate visual priority:

TOP 15%

→ Hospital Capacity Score + System Status

NEXT 20%

→ CRITICAL ALERT / PREDICTED BOTTLENECK

NEXT 30%

→ LARGE CAPACITY FORECAST

NEXT 20%

→ Resource Cards + Department Pressure

BOTTOM 15%

→ AI Insight + Recommended Action

The page should visually communicate:

PROBLEM → PREDICTION → IMPACT → ACTION

without requiring the judge to navigate through multiple pages.

============================================================

WOW PAGE #1 — COMMAND CENTER

============================================================

The Command Center answers:

"What is happening now and what will happen next?"

This is the primary presentation page.

============================================================

PAGE 2 — CAPACITY FORECAST

============================================================

Title:

"AI Capacity Forecast"

Purpose:

Predict future demand and resource utilization.

Filters:

Department

Resource

Time horizon

Date

Main chart:

Historical utilization

AI forecast

Confidence band

Capacity

Critical threshold

Switch between:

Patient Demand

Bed Occupancy

Diagnostic Demand

Procedure Load

Staff Utilization

Forecast summary panel:

Peak predicted demand

Peak time

Capacity remaining

Risk

Confidence

Add:

"Why this forecast?"

Factors:

Recent patient arrivals

Historical hourly pattern

Scheduled procedures

Day-of-week patterns

Current occupancy

============================================================

PAGE 3 — BOTTLENECK INTELLIGENCE

============================================================

Title:

"Predicted Bottlenecks"

Subtitle:

"Identify resource constraints before congestion occurs."

Top:

3 Critical Bottlenecks Detected

Large cards.

Main table:

Resource

Department

Current Usage

Predicted Peak

Capacity

Time to Overload

Risk

Impact

Example:

Emergency Beds

Emergency

88%

97%

50 beds

2h 47m

CRITICAL

CT Scanner

Radiology

91%

104%

100 scans

4h 18m

CRITICAL

General Ward

Ward

87%

94%

200 beds

6h 05m

HIGH

Add Bottleneck Timeline:

NOW → +2H → +4H → +6H → +12H

Show when resources cross thresholds.

============================================================

WOW PAGE #2 — DEPENDENCY NETWORK

============================================================

PAGE TITLE:

"Hospital Dependency Network"

Subtitle:

"How will one shortage affect the rest of the hospital?"

This is a major differentiator.

Use React Flow.

Create a sophisticated interactive hospital dependency graph.

Nodes:

Patient Arrival

Emergency

Beds

Laboratory

CT Scanner

MRI

Diagnosis

Operating Room

General Ward

ICU

Discharge

Connections:

Patient Arrival → Emergency

Emergency → Beds

Emergency → CT

Emergency → Laboratory

CT → Diagnosis

Laboratory → Diagnosis

Diagnosis → Treatment

Treatment → General Ward

Operating Room → ICU

General Ward → ICU

ICU → Discharge

Each connection should have a dependency strength.

Example:

Emergency → Beds

91%

Emergency → CT

72%

Emergency → Laboratory

80%

Use animated directional flow.

------------------------------------------------------------

PROPAGATION INTERACTION

------------------------------------------------------------

When a critical node is selected:

Highlight downstream impact.

Example:

Select:

CT SCANNER

Then visually show:

CT OVERLOAD

      ↓

Diagnostic Delay

      ↓

Treatment Delay

      ↓

Longer Bed Occupancy

      ↓

Bed Availability Falls

      ↓

Emergency Congestion

Use animated edges.

Affected nodes should become highlighted.

Unaffected nodes should become visually subdued.

------------------------------------------------------------

RIGHT-SIDE PROPAGATION PANEL

------------------------------------------------------------

Show:

PROPAGATION ANALYSIS

Primary Bottleneck:

CT Scanner

Direct Impact:

Diagnostic Department

Secondary Impact:

General Ward

Tertiary Impact:

Emergency Beds

Propagation Risk:

HIGH

Impact Score:

78 / 100

Estimated downstream delay:

42 minutes

Add:

"View Recommended Response"

============================================================

WOW PAGE #3 — SCENARIO SIMULATOR

============================================================

Title:

"Capacity Scenario Simulator"

Subtitle:

"Test operational decisions before they impact patients."

This should be one of the most impressive pages.

Create two-column layout.

LEFT:

SCENARIO CONTROLS

Patient Arrival Surge

slider:

-20% → +100%

Emergency Demand

slider

Bed Capacity

slider

CT Capacity

slider

MRI Capacity

slider

Staff Availability

slider

Scheduled Procedures

slider

Preset scenarios:

NORMAL DAY

PATIENT SURGE +30%

FLU OUTBREAK

CT FAILURE

STAFF SHORTAGE

MASS CASUALTY EVENT

Primary button:

RUN SIMULATION

------------------------------------------------------------

SIMULATION ENGINE INTERACTION

------------------------------------------------------------

When user clicks RUN SIMULATION:

1. Show "AI SIMULATION RUNNING..."

2. Animate calculations

3. Update capacity metrics

4. Update risk score

5. Update bottlenecks

6. Update propagation network

7. Update recommendations

Do not simply change numbers instantly.

Make it feel like an intelligent simulation engine.

------------------------------------------------------------

SIMULATION RESULT

------------------------------------------------------------

RIGHT SIDE:

CURRENT STATE

vs

SIMULATED STATE

Example:

Beds

72% → 94%

Emergency

68% → 97%

CT

71% → 103%

Laboratory

64% → 89%

ICU

61% → 78%

Animate metric transitions.

Then:

PROJECTED HOSPITAL RISK

HIGH

------------------------------------------------------------

SCENARIO IMPACT VISUALIZATION

------------------------------------------------------------

Show:

Patient Surge

      ↓

Emergency

      ↓

Beds

      ↓

CT + Laboratory

      ↓

Treatment

      ↓

General Ward

      ↓

ICU

Use React Flow or a custom animated flow.

------------------------------------------------------------

AI RECOMMENDED RESPONSE

------------------------------------------------------------

Display:

AI RECOMMENDED ACTIONS

1. Activate 15 additional beds

2. Redistribute 10 CT slots

3. Prioritize emergency diagnostics

4. Review 6 elective procedures

5. Increase laboratory staffing

Each recommendation should display:

Priority

Expected impact

Reason

Expected improvement

============================================================

THE CORE THREE WOW PAGES

============================================================

If development time becomes limited, prioritize these three pages above all others:

1. COMMAND CENTER

Question answered:

"What is happening and what will happen?"

2. DEPENDENCY NETWORK

Question answered:

"How will one shortage affect the hospital?"

3. SCENARIO SIMULATOR

Question answered:

"What happens if the situation gets worse?"

Together they communicate:

FORECAST → PROPAGATE → EVALUATE SCENARIOS

This is the strongest narrative of the entire product.

============================================================

PAGE 6 — RESOURCE INTELLIGENCE

============================================================

Title:

"Resource Intelligence"

Categories:

Beds

Diagnostics

Staff

Procedure Rooms

Equipment

For each resource:

Capacity

Current utilization

Forecast utilization

Peak load

Availability

Efficiency

Create:

RESOURCE UTILIZATION HEATMAP

Rows:

Departments

Columns:

Hours

Intensity:

Low → High utilization

Also show:

UNDERUTILIZED RESOURCES

Example:

MRI

42% utilization

Available capacity:

58%

AI Recommendation:

"Consider redirecting MRI workload from Radiology Unit B."

============================================================

PAGE 7 — PROCEDURES & SCHEDULING

============================================================

Title:

"Procedure Capacity"

Show:

Today's procedures

Upcoming procedures

Procedure capacity

Expected load

Timeline:

08:00

10:00

12:00

14:00

16:00

18:00

Show procedure blocks.

Each procedure may require:

OR

Staff

Bed

ICU

Diagnostic resources

If scheduling causes a future bottleneck:

CAPACITY CONFLICT DETECTED

Example:

"14:00 cardiac procedures may create ICU capacity pressure at 17:00."

Use amber/red warning indicators.

============================================================

PAGE 8 — AI RECOMMENDATIONS

============================================================

Title:

"Operational Recommendations"

Categories:

URGENT

OPTIMIZATION

PREVENTIVE

EFFICIENCY

Example:

URGENT

"Prepare 12 additional emergency beds."

Reason:

"Bed utilization expected to exceed 95% in 2h 47m."

Impact:

HIGH

Expected improvement:

-8% peak congestion

Buttons:

APPLY SCENARIO

VIEW ANALYSIS

============================================================

PAGE 9 — REPORTS

============================================================

Title:

"Hospital Intelligence Reports"

Cards:

Daily Capacity Report

Weekly Bottleneck Report

Resource Efficiency Report

Forecast Accuracy Report

Scenario Analysis Report

Actions:

View

Export PDF

Download CSV

For frontend prototype, simulate export if backend isn't connected.

============================================================

CRITICAL ALERT DESIGN SYSTEM

============================================================

Critical alerts are a core feature.

They must NOT look like ordinary notifications.

Use:

- severity indicator

- animated pulse

- resource icon

- large percentage

- current → forecast comparison

- countdown

- mini forecast

- impact chain

- recommendation

- action buttons

Example structure:

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0bc798d9-3432-48a0-a32a-3545cc8d2e6d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
