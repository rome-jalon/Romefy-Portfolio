# ECG Analyzer — DSP Pipeline Enhancement Design

**Date:** 2026-03-03
**Status:** Approved
**Scope:** Upgrade signal processing pipeline to match Lead II engineering spec parameters

---

## Goal

Enhance the ECG analyzer's digital signal processing pipeline to support clinical-grade diagnostic bandwidth, powerline noise rejection, and dedicated baseline wander removal — while keeping the existing 12-lead architecture intact.

---

## Changes

### 1. Dual Filter Modes (Diagnostic / Monitoring)

Parameterize `bandpassFilter()` to accept configurable cutoff frequencies instead of hardcoded 0.5–40 Hz.

| Mode | High-Pass | Low-Pass | Use Case |
|---|---|---|---|
| Monitoring (current default) | 0.5 Hz | 40 Hz | HR detection |
| Diagnostic (new) | 0.05 Hz | 150 Hz | Full clinical bandwidth |

- Add `FilterMode` type: `'monitoring' | 'diagnostic'`
- Recalculate Butterworth IIR coefficients per mode
- Warn if sampling rate < 500 Hz in diagnostic mode (per spec: 500 Hz minimum for diagnostic classification)

### 2. Notch Filter (50/60 Hz Powerline Rejection)

New second-order IIR band-reject filter applied after the bandpass stage.

- Q factor ~30 (narrow rejection band)
- User-selectable: Off / 50 Hz / 60 Hz
- New function: `notchFilter(signal, frequency, sampleRate, Q)`

### 3. Enhanced Baseline Removal

Dedicated baseline wander removal stage using moving-average subtraction.

- Window size ~0.8–1.0 seconds
- Applied after bandpass + notch, before Pan-Tompkins
- Especially valuable in diagnostic mode where 0.05 Hz high-pass lets more drift through

### 4. UI Controls on Stage 2

New control bar on the Analyze view:

- **Filter Mode** toggle: Monitoring / Diagnostic
- **Notch Filter** selector: Off / 50 Hz / 60 Hz
- Changing either triggers full re-analysis with progress bar

### 5. Store & Type Updates

- Add `filterMode` and `notchFilter` refs to Pinia store
- New types: `FilterMode`, `NotchFilterSetting`, `DspConfig`
- Update `analyzeFullEcg()` signature to accept DSP config

---

## Updated DSP Pipeline

```
Raw Signal (number[])
    │
    ▼
Bandpass Filter (configurable: 0.5–40 Hz OR 0.05–150 Hz)
    │
    ▼
Notch Filter (optional: 50 Hz or 60 Hz)         ← NEW
    │
    ▼
Baseline Removal (moving-average subtraction)    ← NEW
    │
    ▼
Pan-Tompkins QRS Detection (existing)
    │
    ▼
R-R Interval / HR / Interval Measurements (existing)
```

---

## Files Touched

| File | Change |
|---|---|
| `src/types/ecg.ts` | Add `FilterMode`, `NotchFilterSetting`, `DspConfig` types |
| `src/services/ecg-signal-processing.ts` | Parameterize bandpass, add notch filter, add baseline removal |
| `src/stores/ecg-analyzer.ts` | Add `filterMode`, `notchFilter` state + actions |
| `src/composables/useEcgAnalysis.ts` | Pass DSP config, handle re-analysis on config change |
| `src/views/EcgAnalyzeView.vue` | Add control bar UI |
| `src/assets/main.css` | New classes for DSP control bar |

Canvas composable (`useEcgCanvas.ts`) needs no changes — it renders whatever `filteredSignal` it receives.

---

## Complexity

**Medium overall.** Riskiest area is Butterworth coefficient calculation for the 0.05 Hz diagnostic high-pass (very low cutoff needs careful numerics). Everything else is incremental on the existing architecture.

---

## Reference

Hardware engineering spec: `ecg-change-to-leadII-spec.md`
