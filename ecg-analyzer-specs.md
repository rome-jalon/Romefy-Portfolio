# AI-Powered 12-Lead ECG Analyzer — Application Spec

## Overview

A 3-stage frontend application that allows users to upload 12-lead ECG data (JSON), performs in-browser signal processing (bandpass filtering, Pan-Tompkins R-peak detection, interval measurements), renders waveforms on a Canvas2D ECG-paper grid, and sends extracted metrics to an LLM via OpenRouter for narrative clinical interpretation. Includes 5 pre-built sample datasets and PDF export.

**Route:** `/ecg-analyzer`
**Accent color:** Cyan/teal (`#06b6d4` / `#0891b2`) — distinct from emerald (nutrition) and violet (task-breakdown)

---

## Tech Stack (project-specific additions)

| Layer | Technology |
|-------|-----------|
| Signal Processing | Pure JavaScript DSP (no dependencies) |
| Rendering | Canvas2D API |
| AI Interpretation | OpenRouter API (Google Gemini 2.0 Flash) |
| Validation | Zod |
| PDF Export | html2canvas + jsPDF |

---

## JSON Schema (Fixed)

```json
{
  "metadata": {
    "patientId": "string (optional)",
    "recordingDate": "string (optional)",
    "device": "string (optional)"
  },
  "samplingRate": "number (Hz, 100–10000)",
  "duration": "number (seconds)",
  "leads": {
    "I": "number[]",
    "II": "number[]",
    "III": "number[]",
    "aVR": "number[]",
    "aVL": "number[]",
    "aVF": "number[]",
    "V1": "number[]",
    "V2": "number[]",
    "V3": "number[]",
    "V4": "number[]",
    "V5": "number[]",
    "V6": "number[]"
  }
}
```

### Validation Rules

- `samplingRate` — required, integer, range 100–10,000 Hz
- `duration` — required, positive number
- `leads` — required, must contain all 12 standard lead names
- `leads[*]` — each lead must be a non-empty array of numbers
- All lead arrays must have the same length
- Expected sample count: `samplingRate × duration` (allow ±1% tolerance)
- `metadata` — optional object with optional string fields

### Validation UX

- On upload, validate schema structure immediately
- Display inline errors with field-level specificity (e.g., "Lead V3: array length mismatch — expected 5000, got 4800")
- Block progression to Stage 2 until all validation errors are resolved

---

## Sample Datasets

Five pre-built sample datasets stored in `public/ecg-samples/`:

| File | Condition | Heart Rate | Key Trait |
|------|-----------|-----------|-----------|
| `normal-sinus-rhythm.json` | Normal Sinus Rhythm | ~72 bpm | Regular rhythm, normal intervals |
| `sinus-bradycardia.json` | Sinus Bradycardia | ~48 bpm | Slow rate, regular rhythm |
| `sinus-tachycardia.json` | Sinus Tachycardia | ~115 bpm | Fast rate, regular rhythm |
| `irregular-rhythm.json` | Irregular Rhythm | ~75 bpm | Variable RR intervals |
| `prolonged-qt.json` | Long QT Syndrome | ~65 bpm | QTc ~520ms |

All datasets:
- 500 Hz sampling rate
- 10 seconds duration (5000 samples per lead)
- All 12 standard leads
- Synthetic but physiologically realistic PQRST waveform morphology
- Amplitude values in millivolts (mV)

---

## Stage 1 — Upload

### Functionality

1. **Sample Picker** — Dropdown/selector of the 5 pre-built sample datasets with condition name and description. Selecting a sample fetches its JSON from `/ecg-samples/` and auto-loads it.
2. **Drag-and-drop zone** + file browser fallback for `.json` files
3. On file drop/select or sample pick:
   - Parse JSON
   - Validate against schema (see Validation Rules above)
   - Display a lead summary preview table

### Lead Summary Preview

| Column | Description |
|--------|------------|
| Lead Name | I, II, III, aVR, aVL, aVF, V1–V6 |
| Samples | Number of data points |
| Duration | Seconds |
| Min (mV) | Minimum amplitude |
| Max (mV) | Maximum amplitude |
| Range (mV) | Peak-to-peak amplitude |

### State Output

- Parsed and validated `EcgData` object passed to Stage 2

---

## Stage 2 — Analyze

### Signal Processing Pipeline

All processing is pure JavaScript — no external DSP libraries.

```
Raw signal (number[])
  -> bandpassFilter(0.5–40 Hz, Butterworth IIR biquad)
  -> detectRPeaks(Pan-Tompkins algorithm)
  -> analyzeRRIntervals(mean, stdDev, CV)
  -> calculateHeartRate(60000 / meanRR)
  -> measureIntervals(PR, QRS, QT, QTc)
  -> assessRhythmRegularity(CV thresholds)
  -> detectAbnormalities(compare against normal ranges)
```

Processing runs per-lead with `setTimeout(0)` yields between leads for UI responsiveness.

#### Bandpass Filter

- Type: 2nd-order Butterworth IIR biquad
- Passband: 0.5–40 Hz (standard ECG diagnostic band)
- Removes baseline wander (< 0.5 Hz) and high-frequency noise (> 40 Hz)

#### Pan-Tompkins R-Peak Detection

1. **Differentiate** — approximate first derivative
2. **Square** — amplify large slopes, suppress small ones
3. **Moving Window Integration** — window width = 150ms × samplingRate
4. **Adaptive Threshold** — dual threshold with 200ms refractory period
   - Signal peak = running max of integration signal
   - Noise peak = running max of noise
   - Threshold = noisePeak + 0.25 × (signalPeak − noisePeak)

#### Interval Measurements

| Interval | Method | Normal Range |
|----------|--------|-------------|
| RR | Distance between consecutive R-peaks (ms) | 600–1200 ms |
| Heart Rate | 60,000 / mean RR (bpm) | 60–100 bpm |
| PR | R-peak backward search for P-wave onset to R-peak (ms) | 120–200 ms |
| QRS | Width of QRS complex at half-amplitude (ms) | 60–120 ms |
| QT | Q-wave onset to T-wave end (ms) | 350–450 ms |
| QTc | QT / √(RR in seconds) — Bazett's formula (ms) | 350–440 ms (male), 350–460 ms (female) |

#### Rhythm Regularity Assessment

- **Regular**: RR interval coefficient of variation (CV) < 10%
- **Mildly Irregular**: CV 10–20%
- **Irregular**: CV > 20%

#### Abnormality Detection

| Abnormality | Condition |
|------------|-----------|
| Bradycardia | HR < 60 bpm |
| Tachycardia | HR > 100 bpm |
| Irregular Rhythm | RR CV > 20% |
| Prolonged PR | PR > 200 ms |
| Short PR | PR < 120 ms |
| Wide QRS | QRS > 120 ms |
| Prolonged QT | QTc > 440 ms (male) / 460 ms (female) |
| Short QT | QTc < 350 ms |

Each abnormality has a severity: `normal`, `warning`, or `critical`.

### Canvas2D ECG Waveform Display

#### Grid

- **Background**: Dark (matching app theme)
- **Small grid**: 1mm squares, subtle green lines
- **Large grid**: 5mm squares, brighter green lines
- Standard calibration: 25mm/s horizontal, 10mm/mV vertical

#### Lead Layout (3x4 + 1 Rhythm Strip)

| Row | Col 1 | Col 2 | Col 3 | Col 4 |
|-----|-------|-------|-------|-------|
| 1 | I | aVR | V1 | V4 |
| 2 | II | aVL | V2 | V5 |
| 3 | III | aVF | V3 | V6 |
| 4 (full width) | Lead II — full rhythm strip |

Each strip shows 2.5 seconds of data. The bottom rhythm strip shows the full 10-second recording.

#### Waveform Rendering

- Line color: Emerald/teal (`#06b6d4`) on dark background
- Line width: 1.5px
- R-peak markers: Small red triangle markers above detected peaks (toggleable)
- Lead labels: White text in top-left corner of each strip

#### Toolbar

| Control | Description |
|---------|------------|
| Grid toggle | Show/hide ECG paper grid |
| R-peak markers toggle | Show/hide R-peak detection markers |

#### Responsive Rendering

- `ResizeObserver` to track container size changes
- `devicePixelRatio` scaling for crisp HiDPI rendering
- Canvas redraws on resize

### Metrics Panel

Grid of metric cards displayed alongside the waveform:

| Metric | Display | Unit |
|--------|---------|------|
| Heart Rate | Numeric value | bpm |
| PR Interval | Numeric value | ms |
| QRS Duration | Numeric value | ms |
| QTc Interval | Numeric value | ms |
| RR Mean | Numeric value | ms |
| RR Std Dev | Numeric value | ms |
| Rhythm | Text label | — |

#### Color Coding

- **Green** (`.is-normal`): Within normal range
- **Yellow** (`.is-warning`): Borderline abnormal
- **Red** (`.is-critical`): Clearly abnormal

### Abnormality Flags

- List of detected abnormality badges below or beside the metrics panel
- Each badge shows: icon + abnormality name + severity level
- Severity colors match metric card coding (green/yellow/red)
- If no abnormalities: "No abnormalities detected" in green

### Loading State

- Progress bar shown during signal processing
- Display: "Analyzing lead X of 12..." with percentage
- Processing yields to event loop between leads for smooth progress updates

### State Output

- `EcgAnalysisResult` object containing per-lead analysis, aggregate metrics, and abnormality flags passed to Stage 3

---

## Stage 3 — Report

### AI Interpretation

| Property | Value |
|----------|-------|
| **Provider** | Google Gemini 2.0 Flash via OpenRouter |
| **Endpoint** | `https://openrouter.ai/api/v1/chat/completions` |
| **Model** | `google/gemini-2.0-flash-001` |
| **Auth** | `VITE_OPENROUTER_API_KEY` environment variable |
| **System Prompt** | Fixed cardiology AI assistant prompt |
| **Response Mode** | All at once (no streaming) |
| **Output Format** | Structured JSON (enforced via prompt, validated with Zod) |
| **Retry** | Exponential backoff, max 3 retries on 5xx errors |

#### System Prompt

> You are a cardiology AI assistant. Given extracted ECG metrics, provide a structured clinical interpretation. Return a JSON object with the following sections. Each section value is a string paragraph.

#### AI Response Schema

```json
{
  "summary": "string — 1-2 sentence overall interpretation",
  "rhythmAnalysis": "string — rhythm regularity and classification",
  "rateAssessment": "string — heart rate analysis",
  "intervalAnalysis": "string — PR, QRS, QT/QTc interval analysis",
  "axisEstimation": "string — estimated electrical axis based on lead amplitudes",
  "abnormalityAssessment": "string — detailed discussion of any detected abnormalities",
  "clinicalCorrelation": "string — suggested clinical correlations and follow-up"
}
```

#### User Prompt Format

Structured text of all extracted metrics:
- Heart rate and rhythm classification
- RR interval statistics (mean, std dev, CV)
- Interval measurements (PR, QRS, QT, QTc)
- List of detected abnormalities with severity
- Per-lead amplitude summary

### Report Display

The AI report is displayed as a card with distinct sections:

| Section | Content |
|---------|---------|
| Summary | Overall interpretation (highlighted/prominent) |
| Rhythm Analysis | Rhythm findings |
| Rate Assessment | Heart rate analysis |
| Interval Analysis | PR, QRS, QT/QTc findings |
| Axis Estimation | Electrical axis |
| Abnormality Assessment | Detailed abnormality discussion |
| Clinical Correlation | Suggested follow-up |

### Medical Disclaimer

A prominent, always-visible banner:

> **Disclaimer:** This AI-generated analysis is for educational and demonstration purposes only. It does not constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions. Do not use this tool for clinical decision-making.

### Metrics Sidebar

A condensed version of Stage 2 metrics displayed alongside the AI report for reference:
- Heart Rate
- Rhythm classification
- PR, QRS, QTc intervals
- Abnormality flag count

### PDF Export

| Property | Value |
|----------|-------|
| **Trigger** | "Export PDF" button in report header |
| **Library** | html2canvas + jsPDF |
| **Page size** | A4, landscape orientation |
| **Background** | Dark (`#09090b`) matching app theme |
| **Quality** | 2x resolution capture for crisp rendering |

#### PDF Structure

1. Header: "ECG Analysis Report", export date
2. Metrics summary (HR, rhythm, intervals)
3. Abnormality flags
4. AI interpretation sections
5. Medical disclaimer

---

## Error Handling

| Scenario | Behavior |
|----------|---------|
| Invalid JSON syntax | Inline error message with parse failure details |
| Schema validation failure | Inline errors per field, block Stage 2 progression |
| Lead array length mismatch | Specific error indicating which leads mismatch |
| Signal processing failure | Per-lead error tolerance — skip failed leads, show warning |
| OpenRouter API key missing | Full-screen error with setup instructions |
| OpenRouter API error (401/403) | "API key is missing or invalid" with setup link |
| OpenRouter rate limit (429) | "Too many requests — please wait and try again" |
| OpenRouter usage limit (402) | "AI service has reached its usage limit" |
| AI response parse failure | "Failed to parse AI response — try regenerating" |
| Network error | "Cannot connect to OpenRouter — check your connection" |
| Sample file fetch failure | "Failed to load sample dataset — try refreshing" |
| Canvas rendering error | Fallback message in canvas area |

---

## Normal Ranges Reference

| Parameter | Normal | Warning | Critical |
|-----------|--------|---------|----------|
| Heart Rate | 60–100 bpm | 50–60 or 100–110 bpm | < 50 or > 110 bpm |
| PR Interval | 120–200 ms | 200–220 ms | > 220 ms or < 120 ms |
| QRS Duration | 60–120 ms | 120–140 ms | > 140 ms |
| QTc (general) | 350–440 ms | 440–500 ms | > 500 ms or < 350 ms |
| RR CV | < 10% | 10–20% | > 20% |

---

## USDA Nutrient ID Equivalent — ECG Lead Names

The 12 standard ECG leads:

| Category | Leads |
|----------|-------|
| Limb Leads | I, II, III |
| Augmented Leads | aVR, aVL, aVF |
| Precordial Leads | V1, V2, V3, V4, V5, V6 |

---

## CSS Convention

- All classes prefixed `.ecg-*` (matching `.tb-*` pattern from task-breakdown)
- Accent color: Cyan/teal (`#06b6d4` primary, `#0891b2` darker)
- Severity modifiers: `.is-normal` (green), `.is-warning` (yellow/amber), `.is-critical` (red)
- Dark theme using existing `--color-*` CSS variables
- Canvas-specific classes: `.ecg-canvas-wrap`, `.ecg-canvas`, `.ecg-toolbar`

---

## Out of Scope

- No backend
- No database
- No authentication or user accounts
- No streaming AI response
- No real ECG hardware integration
- No DICOM/HL7/FHIR file format support
- No multi-patient comparison
- No historical recording storage
- Not intended for clinical use — educational/demo only
