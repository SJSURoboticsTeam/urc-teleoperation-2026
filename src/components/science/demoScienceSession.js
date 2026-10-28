// Static snapshot for lite/demo modes, where there is no backend.
// Same shape as the scienceSession broadcast. Absorbance values are precomputed

export const demoScienceSession = {
  mock: true,
  stopped: false,
  activeSite: null,
  steps: [
    "Start",
    "Step 1",
    "Step 2",
    "Step 3",
    "Step 4",
    "Step 5",
    "Step 6",
    "Step 7",
    "Step 8",
    "Step 9",
    "Step 10",
  ],
  wavelengths: [415, 455, 480, 515, 555, 590, 630, 680],
  logFile: null,
  sites: [
    {
      id: 0,
      name: "Site 1",
      status: "complete",
      currentStep: 10,
      pendingStep: null,
      lastError: null,
      startedAt: "2026-10-16T20:15:00.000-07:00",
      completedAt: "2026-10-16T20:16:30.000-07:00",
      spectro: {
        clear: {
          raw: [65535, 1364, 696, 568, 1466, 4655, 1140, 338],
          saturated: [0],
        },
        vials: {
          purple: {
            raw: [9875, 136, 78, 68, 166, 494, 117, 37],
            absorbance: [0.822, 1.001, 0.951, 0.922, 0.946, 0.974, 0.989, 0.961],
            saturated: [],
          },
          blue: {
            raw: [17042, 231, 148, 104, 302, 817, 211, 68],
            absorbance: [0.585, 0.771, 0.672, 0.737, 0.686, 0.756, 0.733, 0.696],
            saturated: [],
          },
          red: {
            raw: [15923, 281, 271, 171, 276, 1156, 269, 92],
            absorbance: [0.614, 0.686, 0.41, 0.521, 0.725, 0.605, 0.627, 0.565],
            saturated: [],
          },
        },
      },
      environment: [
        {
          t: "2026-10-16T20:16:30.000-07:00",
          pressure_hpa: 1012.8,
          humidity_pct: 38.9,
          temperature_c: 22.4,
        },
      ],
    },
    {
      id: 1,
      name: "Site 2",
      status: "not_started",
      currentStep: -1,
      pendingStep: null,
      lastError: null,
      startedAt: null,
      completedAt: null,
      spectro: { clear: null, vials: {} },
      environment: [],
    },
    {
      id: 2,
      name: "Site 3",
      status: "not_started",
      currentStep: -1,
      pendingStep: null,
      lastError: null,
      startedAt: null,
      completedAt: null,
      spectro: { clear: null, vials: {} },
      environment: [],
    },
  ],
};
