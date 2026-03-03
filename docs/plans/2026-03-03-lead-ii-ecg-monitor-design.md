# Lead II ECG Monitor — Design

**Date:** 2026-03-03
**Status:** Approved
**Scope:** New standalone portfolio app for live Lead II monitoring with technician review workflow

---

## Goal

A live Lead II ECG monitoring station where a certified technician reviews real-time readings, evaluates system auto-analysis (DSP + AI interpretation), flags incorrect or concerning findings, and simulates pushing notifications to a client care team.

---

## Route & Registration

- **Route:** `/ecg-monitor`
- **Project registry:**
  ```
  id: 'ecg-monitor'
  title: 'Lead II ECG Monitor'
  description: 'Live Lead II monitoring station with technician review, flagging, and simulated client notifications'
  tags: ['lead-ii', 'real-time', 'monitoring', 'ai-interpretation', 'canvas']
  icon: 'HeartPulse'
  route: '/ecg-monitor'
  ```

---

## Layout

```
+-----------------------------------------------------------+
|  Header: "Lead II Monitor" + Patient ID + Back + Disclaimer|
+-------------------------------------+---------------------+
|                                     |  System Findings     |
|   Live Lead II Sweep Canvas         |  - HR, Rhythm        |
|   (~60% width)                      |  - Intervals         |
|                                     |  - Abnormalities     |
|                                     |  - AI Narrative      |
|                                     +---------------------+
|                                     |  Technician Actions  |
|                                     |  [Confirm] [Flag]    |
|                                     |  [Next Patient ->]   |
+-------------------------------------+---------------------+
|  Notification Log (collapsible bottom bar)                 |
+-----------------------------------------------------------+
```

Single full-screen page. No sub-routes, no stages.

---

## Live Sweep Canvas

Classic bedside monitor sweep line on Canvas2D:

- Dark background with subtle green ECG grid
- Single Lead II trace in **green** (distinct from the 12-lead analyzer's cyan)
- Vertical sweep line moves left-to-right at 25 mm/s
- Draws waveform behind sweep, blank/faded region ahead
- Wraps back to left when reaching the right edge
- Continuous animation via `requestAnimationFrame`
- Top-right overlay: large HR number + rhythm label (updated per 10s segment)

Data feeding: patient generator produces Lead II samples at 500 Hz into a ring buffer. Canvas consumes samples at the sweep rate.

---

## Simulated Patient Feed

Pool of 8 simulated patients, each with a pre-defined cardiac profile:

| Patient | Condition | HR | Notable Findings |
|---|---|---|---|
| P-001 | Normal Sinus Rhythm | ~72 | Clean, nothing to flag |
| P-002 | Sinus Bradycardia | ~48 | Low HR warning |
| P-003 | Sinus Tachycardia | ~115 | Elevated HR |
| P-004 | Atrial Fibrillation | ~85 | Irregular rhythm, absent P waves |
| P-005 | First-Degree AV Block | ~68 | Prolonged PR interval |
| P-006 | ST Elevation (STEMI) | ~80 | Critical — needs flagging |
| P-007 | Prolonged QT | ~65 | Arrhythmia risk |
| P-008 | Wide QRS | ~80 | Conduction delay |

Each patient uses the existing PQRST Gaussian generator logic (Lead II only), generating samples continuously into a ring buffer. Powerline noise and baseline wander are included.

"Next Patient" resets the sweep, fills buffer with new profile, re-runs analysis.

All client-side — no backend. Patient profiles stored in a config array.

---

## Analysis Pipeline

Auto-analysis runs every completed 10-second segment:

1. Collect 5000 samples (10s @ 500 Hz) from ring buffer
2. Run existing DSP: bandpass (monitoring mode) -> notch -> baseline removal -> Pan-Tompkins -> interval measurements -> abnormality detection
3. Call AI interpretation service (same OpenRouter/Gemini endpoint)
4. Push results to the findings panel

Reuses all functions from `ecg-signal-processing.ts` and `ecg-ai-interpretation.ts` via direct import.

---

## Technician Review

**Right panel — System Findings:**

- Metrics cards: HR, Rhythm, PR, QRS, QTc (same style as existing EcgMetricsPanel)
- Abnormality flags: severity-colored badges (green/yellow/red)
- AI Narrative: collapsible 7-part interpretation
- Label: "System Interpretation — Review Required"

**Technician Actions:**

- **Confirm Reading** (green) — agrees with system, logs as reviewed
- **Flag as Concerning** (red) — opens form:
  - Urgency selector: Routine / Urgent / Critical
  - Brief technician note (free text, optional)
  - "Send Notification" button -> fires toast + adds to log
- **Override Findings** (secondary) — edit rhythm label or add correction note
- **Next Patient ->** — cycles to next patient in pool

---

## Notification System

**Toast notification:**
- Slides in from top-right on "Send Notification"
- Content: "Alert sent for Patient P-006 — Critical: ST Elevation"
- Color-coded border: green (Routine), amber (Urgent), red (Critical)
- Auto-dismisses after 5 seconds

**Notification log (collapsible bottom bar):**
- Toggle button with count badge: "Notifications (3)"
- Scrollable list of all sent alerts
- Each entry: timestamp, patient ID, urgency badge, finding summary, technician note
- Persists for session, resets on page reload
- Stored in Pinia state only — no backend

**Medical disclaimer** always visible in header: "For demonstration purposes only — not for clinical use"

---

## Files

### New files

| File | Purpose |
|---|---|
| `src/views/EcgMonitorApp.vue` | Main app shell — layout, header, disclaimer |
| `src/components/ecg-monitor/MonitorSweepCanvas.vue` | Live sweep-line Canvas2D |
| `src/components/ecg-monitor/MonitorFindings.vue` | Right panel — metrics, flags, AI narrative |
| `src/components/ecg-monitor/MonitorActions.vue` | Confirm / Flag / Override / Next buttons + form |
| `src/components/ecg-monitor/MonitorNotificationLog.vue` | Collapsible bottom notification bar |
| `src/components/ecg-monitor/MonitorToast.vue` | Toast notification component |
| `src/stores/ecg-monitor.ts` | Pinia store — patient, results, notifications, review state |
| `src/composables/useMonitorFeed.ts` | Patient generator + ring buffer + segment cycling |
| `src/composables/useMonitorAnalysis.ts` | DSP + AI on completed segments |
| `src/composables/useMonitorSweep.ts` | Canvas sweep-line animation (requestAnimationFrame) |
| `src/config/monitor-patients.ts` | 8 patient profiles with wave parameters |

### Modified files

| File | Change |
|---|---|
| `src/config/projects.ts` | Add ecg-monitor entry |
| `src/router/index.ts` | Add /ecg-monitor route |
| `src/assets/main.css` | Add .monitor-* CSS classes |

### Reused (import, don't copy)

- DSP functions from `ecg-signal-processing.ts`
- AI interpretation from `ecg-ai-interpretation.ts`
- Types from `ecg.ts`

No changes to the existing 12-lead analyzer.

---

## Reference

Hardware engineering spec: `ecg-change-to-leadII-spec.md`
