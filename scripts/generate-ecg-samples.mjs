/**
 * generate-ecg-samples.mjs
 *
 * Generates 5 synthetic 12-lead ECG sample JSON files with realistic PQRST
 * waveform morphology, lead-specific amplitude multipliers, and small
 * Gaussian noise for realism.
 *
 * Usage:  node scripts/generate-ecg-samples.mjs
 */

import { writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAMPLING_RATE = 500; // Hz
const DURATION = 10; // seconds
const TOTAL_SAMPLES = SAMPLING_RATE * DURATION; // 5000

const OUTPUT_DIR = join(
  import.meta.dirname ?? ".",
  "..",
  "public",
  "ecg-samples"
);

// ---------------------------------------------------------------------------
// Lead-specific amplitude multipliers (relative to Lead II = 1.0)
// Keys: P, R, S (extra for precordial rS pattern), T
// Q is derived as a small fraction of R.
// ---------------------------------------------------------------------------

const LEAD_MULTIPLIERS = {
  I:   { P:  0.8, R:  0.7, S:  0.0, T:  0.7 },
  II:  { P:  1.0, R:  1.0, S:  0.0, T:  1.0 },
  III: { P:  0.3, R:  0.4, S:  0.0, T:  0.4 },
  aVR: { P: -0.8, R: -0.8, S:  0.0, T: -0.7 },
  aVL: { P:  0.4, R:  0.5, S:  0.0, T:  0.5 },
  aVF: { P:  0.6, R:  0.6, S:  0.0, T:  0.6 },
  V1:  { P:  0.5, R:  0.3, S: -1.2, T: -0.3 },
  V2:  { P:  0.5, R:  0.5, S: -0.8, T:  0.4 },
  V3:  { P:  0.5, R:  0.8, S: -0.5, T:  0.5 },
  V4:  { P:  0.5, R:  1.2, S: -0.3, T:  0.6 },
  V5:  { P:  0.5, R:  1.1, S: -0.1, T:  0.6 },
  V6:  { P:  0.5, R:  0.9, S:  0.0, T:  0.5 },
};

const LEAD_NAMES = [
  "I", "II", "III", "aVR", "aVL", "aVF",
  "V1", "V2", "V3", "V4", "V5", "V6",
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Gaussian function centred at `center` (in seconds) with given `width` (sigma). */
function gaussian(t, center, width, amplitude) {
  const z = (t - center) / width;
  return amplitude * Math.exp(-0.5 * z * z);
}

/** Box-Muller transform – returns a single standard-normal variate. */
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Small Gaussian noise (±~0.02 mV). */
function noise() {
  return randn() * 0.02;
}

// ---------------------------------------------------------------------------
// Single-beat PQRST generator (returns value in mV for a given time offset
// within one RR interval, using lead-specific multipliers).
//
// Timing parameters (all in ms, converted to seconds internally):
//   pDur   – P wave duration          (~80 ms)
//   prSeg  – PR segment (flat)        (~60 ms)
//   qDur   – Q wave duration          (~20 ms)
//   rDur   – R wave duration          (~30 ms)
//   sDur   – S wave duration          (~30 ms)
//   stSeg  – ST segment (flat)        (~80 ms)
//   tDur   – T wave duration          (~160 ms)
//
// Amplitudes (Lead II reference, in mV):
//   pAmp   – P wave amplitude          0.15–0.25
//   rAmp   – R wave amplitude          1.0–1.5
//   qAmp   – Q wave amplitude          -0.1
//   sAmp   – S wave amplitude          -0.3
//   tAmp   – T wave amplitude          0.3
// ---------------------------------------------------------------------------

/**
 * Build one beat's worth of samples for every lead.
 *
 * @param {number} beatSamples  – Number of samples in this RR interval.
 * @param {object} params       – Wave timing / amplitude parameters.
 * @returns {Object<string, number[]>}  lead name -> array of sample values
 */
function generateBeat(beatSamples, params) {
  const {
    pDur   = 80,
    prSeg  = 60,
    qDur   = 20,
    rDur   = 30,
    sDur   = 30,
    stSeg  = 80,
    tDur   = 160,
    pAmp   = 0.20,
    rAmp   = 1.2,
    qAmp   = -0.1,
    sAmpBase = -0.3,
    tAmp   = 0.3,
  } = params;

  // Convert durations from ms to seconds
  const pD  = pDur  / 1000;
  const prS = prSeg / 1000;
  const qD  = qDur  / 1000;
  const rD  = rDur  / 1000;
  const sD  = sDur  / 1000;
  const stS = stSeg / 1000;
  const tD  = tDur  / 1000;

  // Compute centres (cumulative) of each wave component
  const pCenter  = pD / 2;                                   // centre of P
  const prEnd    = pD + prS;                                  // end of PR segment
  const qCenter  = prEnd + qD / 2;                            // centre of Q
  const rCenter  = prEnd + qD + rD / 2;                       // centre of R
  const sCenter  = prEnd + qD + rD + sD / 2;                  // centre of S
  const stEnd    = prEnd + qD + rD + sD + stS;                // end of ST segment
  const tCenter  = stEnd + tD / 2;                            // centre of T

  // Gaussian sigma (width) for each wave – roughly duration / 4 so that the
  // wave spans ~±2 sigma.
  const pSigma = pD / 4;
  const qSigma = qD / 4;
  const rSigma = rD / 4;
  const sSigma = sD / 4;
  const tSigma = tD / 4;

  const dt = 1 / SAMPLING_RATE; // seconds per sample

  const result = {};
  for (const lead of LEAD_NAMES) {
    const m = LEAD_MULTIPLIERS[lead];
    const samples = new Array(beatSamples);

    for (let i = 0; i < beatSamples; i++) {
      const t = i * dt;

      let val = 0;

      // P wave
      val += gaussian(t, pCenter, pSigma, pAmp * m.P);

      // Q wave (small negative dip, scaled proportionally to R multiplier)
      val += gaussian(t, qCenter, qSigma, qAmp * Math.abs(m.R));

      // R wave
      val += gaussian(t, rCenter, rSigma, rAmp * m.R);

      // S wave – use the lead-specific S multiplier if non-zero, otherwise use
      // the base S amplitude scaled by R multiplier direction.
      const effectiveSAmp =
        m.S !== 0
          ? sAmpBase * (m.S / -0.3) // normalise to the base S amplitude
          : sAmpBase * (m.R > 0 ? 1 : -1);
      val += gaussian(t, sCenter, sSigma, effectiveSAmp);

      // T wave
      val += gaussian(t, tCenter, tSigma, tAmp * m.T);

      // Add noise
      val += noise();

      samples[i] = val;
    }

    result[lead] = samples;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Full-trace generator – tiles beats across TOTAL_SAMPLES
// ---------------------------------------------------------------------------

/**
 * @param {object} config
 * @param {number} config.rrMs           – RR interval in ms (or mean for irregular)
 * @param {boolean} config.irregular     – If true, randomise each RR interval
 * @param {number[]} config.rrRange      – [min, max] ms for irregular RR
 * @param {object} config.waveParams     – Passed through to generateBeat
 * @returns {Object<string, number[]>}   – 12-lead object, each with TOTAL_SAMPLES entries
 */
function generateTrace(config) {
  const {
    rrMs = 833,
    irregular = false,
    rrRange = [650, 950],
    waveParams = {},
  } = config;

  // Initialise empty lead arrays
  const leads = {};
  for (const lead of LEAD_NAMES) {
    leads[lead] = [];
  }

  let samplesPlaced = 0;

  while (samplesPlaced < TOTAL_SAMPLES) {
    // Determine this beat's RR interval in samples
    let currentRR;
    if (irregular) {
      const rrMsRand =
        rrRange[0] + Math.random() * (rrRange[1] - rrRange[0]);
      currentRR = Math.round((rrMsRand / 1000) * SAMPLING_RATE);
    } else {
      currentRR = Math.round((rrMs / 1000) * SAMPLING_RATE);
    }

    // Don't exceed total
    const remaining = TOTAL_SAMPLES - samplesPlaced;
    const beatSamples = Math.min(currentRR, remaining);

    const beat = generateBeat(beatSamples, waveParams);

    for (const lead of LEAD_NAMES) {
      for (let i = 0; i < beatSamples; i++) {
        leads[lead].push(beat[lead][i]);
      }
    }

    samplesPlaced += beatSamples;
  }

  // Round all values to 4 decimal places
  for (const lead of LEAD_NAMES) {
    for (let i = 0; i < leads[lead].length; i++) {
      leads[lead][i] = Math.round(leads[lead][i] * 10000) / 10000;
    }
  }

  return leads;
}

// ---------------------------------------------------------------------------
// Dataset definitions
// ---------------------------------------------------------------------------

const datasets = [
  {
    filename: "normal-sinus-rhythm.json",
    patientId: "SAMPLE-001",
    recordingDate: "2024-01-15",
    traceConfig: {
      rrMs: 833, // ~72 bpm
      waveParams: {
        pDur: 80,
        prSeg: 60,  // PR total ~160ms (pDur 80 + prSeg 60 + Q onset ~20)
        qDur: 20,
        rDur: 30,
        sDur: 30,
        stSeg: 80,
        tDur: 160,
        pAmp: 0.20,
        rAmp: 1.2,
        qAmp: -0.1,
        sAmpBase: -0.3,
        tAmp: 0.30,
      },
    },
  },
  {
    filename: "sinus-bradycardia.json",
    patientId: "SAMPLE-002",
    recordingDate: "2024-01-15",
    traceConfig: {
      rrMs: 1250, // ~48 bpm
      waveParams: {
        pDur: 80,
        prSeg: 70,  // PR ~170ms
        qDur: 20,
        rDur: 28,
        sDur: 30,
        stSeg: 90,
        tDur: 170,
        pAmp: 0.22,
        rAmp: 1.3,
        qAmp: -0.1,
        sAmpBase: -0.3,
        tAmp: 0.32,
      },
    },
  },
  {
    filename: "sinus-tachycardia.json",
    patientId: "SAMPLE-003",
    recordingDate: "2024-01-15",
    traceConfig: {
      rrMs: 522, // ~115 bpm
      waveParams: {
        pDur: 70,
        prSeg: 50,  // PR ~140ms
        qDur: 18,
        rDur: 28,
        sDur: 28,
        stSeg: 60,
        tDur: 130,
        pAmp: 0.18,
        rAmp: 1.1,
        qAmp: -0.08,
        sAmpBase: -0.25,
        tAmp: 0.25,
      },
    },
  },
  {
    filename: "irregular-rhythm.json",
    patientId: "SAMPLE-004",
    recordingDate: "2024-01-15",
    traceConfig: {
      rrMs: 800, // ~75 bpm average (not actually used when irregular=true)
      irregular: true,
      rrRange: [650, 950],
      waveParams: {
        pDur: 80,
        prSeg: 60,
        qDur: 20,
        rDur: 30,
        sDur: 30,
        stSeg: 80,
        tDur: 160,
        pAmp: 0.20,
        rAmp: 1.2,
        qAmp: -0.1,
        sAmpBase: -0.3,
        tAmp: 0.30,
      },
    },
  },
  {
    filename: "prolonged-qt.json",
    patientId: "SAMPLE-005",
    recordingDate: "2024-01-15",
    traceConfig: {
      rrMs: 923, // ~65 bpm
      waveParams: {
        pDur: 80,
        prSeg: 60,
        qDur: 20,
        rDur: 30,
        sDur: 30,
        stSeg: 120, // Longer ST segment to prolong QT
        tDur: 220,  // Wider T wave for prolonged QT (~480ms total QT)
        pAmp: 0.20,
        rAmp: 1.2,
        qAmp: -0.1,
        sAmpBase: -0.3,
        tAmp: 0.35, // Slightly taller T to go with the wider shape
      },
    },
  },
  {
    filename: "first-degree-av-block.json",
    patientId: "SAMPLE-006",
    recordingDate: "2024-02-10",
    traceConfig: {
      rrMs: 882, // ~68 bpm
      waveParams: {
        pDur: 90,
        prSeg: 130, // PR total ~240ms (very prolonged)
        qDur: 20,
        rDur: 30,
        sDur: 30,
        stSeg: 80,
        tDur: 160,
        pAmp: 0.22,
        rAmp: 1.2,
        qAmp: -0.1,
        sAmpBase: -0.3,
        tAmp: 0.30,
      },
    },
  },
  {
    filename: "wide-qrs-complex.json",
    patientId: "SAMPLE-007",
    recordingDate: "2024-02-10",
    traceConfig: {
      rrMs: 750, // ~80 bpm
      waveParams: {
        pDur: 80,
        prSeg: 60,
        qDur: 35,   // Wider Q
        rDur: 50,   // Wider R – gives QRS ~145ms (wide)
        sDur: 50,   // Wider S
        stSeg: 70,
        tDur: 170,
        pAmp: 0.20,
        rAmp: 1.3,
        qAmp: -0.15,
        sAmpBase: -0.4,
        tAmp: 0.35,
      },
    },
  },
  {
    filename: "atrial-fibrillation.json",
    patientId: "SAMPLE-008",
    recordingDate: "2024-02-10",
    traceConfig: {
      rrMs: 700, // ~85 bpm average (not used — irregular)
      irregular: true,
      rrRange: [450, 1100], // Very wide RR range for AF
      waveParams: {
        pDur: 40,    // Tiny / absent P waves
        prSeg: 30,
        qDur: 20,
        rDur: 30,
        sDur: 30,
        stSeg: 80,
        tDur: 150,
        pAmp: 0.04,  // Nearly absent P waves (fibrillatory baseline)
        rAmp: 1.15,
        qAmp: -0.1,
        sAmpBase: -0.3,
        tAmp: 0.28,
      },
    },
  },
  {
    filename: "left-ventricular-hypertrophy.json",
    patientId: "SAMPLE-009",
    recordingDate: "2024-03-05",
    traceConfig: {
      rrMs: 857, // ~70 bpm
      waveParams: {
        pDur: 90,    // Slightly wider P (left atrial enlargement)
        prSeg: 60,
        qDur: 22,
        rDur: 32,
        sDur: 35,
        stSeg: 80,
        tDur: 170,
        pAmp: 0.25,
        rAmp: 1.8,   // Tall R wave amplitude (LVH hallmark)
        qAmp: -0.12,
        sAmpBase: -0.5, // Deep S waves (especially V1-V3)
        tAmp: 0.38,
      },
    },
  },
  {
    filename: "st-elevation.json",
    patientId: "SAMPLE-010",
    recordingDate: "2024-03-05",
    traceConfig: {
      rrMs: 750, // ~80 bpm
      waveParams: {
        pDur: 78,
        prSeg: 58,
        qDur: 22,
        rDur: 28,
        sDur: 28,
        stSeg: 100,  // Slightly longer ST
        tDur: 180,   // Broader T wave
        pAmp: 0.18,
        rAmp: 1.0,   // Slightly reduced R (loss of R-wave height in infarct)
        qAmp: -0.18, // Deeper Q waves (pathological Q)
        sAmpBase: -0.25,
        tAmp: 0.55,  // Tall peaked T wave (hyperacute T / ST elevation effect)
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Main – generate and write all files
// ---------------------------------------------------------------------------

console.log(`Output directory: ${OUTPUT_DIR}`);
console.log(`Generating ${datasets.length} ECG sample files...\n`);

for (const ds of datasets) {
  const leads = generateTrace(ds.traceConfig);

  const ecg = {
    metadata: {
      patientId: ds.patientId,
      recordingDate: ds.recordingDate,
      device: "ECG Simulator v1.0",
    },
    samplingRate: SAMPLING_RATE,
    duration: DURATION,
    leads,
  };

  const filePath = join(OUTPUT_DIR, ds.filename);
  writeFileSync(filePath, JSON.stringify(ecg, null, 2), "utf-8");

  // Quick validation
  const leadCount = Object.keys(ecg.leads).length;
  const sampleCounts = LEAD_NAMES.map((l) => ecg.leads[l].length);
  const allCorrect = sampleCounts.every((n) => n === TOTAL_SAMPLES);

  console.log(
    `  ${ds.filename}` +
      `  | leads: ${leadCount}` +
      `  | samples/lead: ${sampleCounts[0]}` +
      `  | OK: ${allCorrect && leadCount === 12 ? "YES" : "NO"}`
  );
}

console.log("\nDone. All ECG sample files generated successfully.");
