export const ARM_JOINT_KEYS = [
  "track",
  "shoulder",
  "elbow",
  "pitch",
  "roll",
  "clamp",
];

export const ARM_JOINT_CONFIG = [
  { label: "Elbow (deg)", key: "elbow", min: -100, max: 10, initial: -20 },
  { label: "Shoulder (deg)", key: "shoulder", min: -20, max: 90, initial: 0 },
  { label: "Track (mm)", key: "track", min: 0, max: 300, initial: 0 },
  { label: "Pitch (deg)", key: "pitch", min: 0, max: 180, initial: 0 },
  { label: "Roll (deg)", key: "roll", min: 0, max: 360, initial: 0 },
  { label: "Clamp", key: "clamp", min: 0, max: 20, initial: 0 },
];

export const ARM_JOINT_META = Object.fromEntries(
  ARM_JOINT_CONFIG.map((joint) => [joint.key, joint]),
);

export const ARM_DEFAULTS = Object.fromEntries(
  ARM_JOINT_CONFIG.map((joint) => [joint.key, joint.initial]),
);

export const ARM_LIMITS = Object.fromEntries(
  ARM_JOINT_CONFIG.map((joint) => [
    joint.key,
    {
      min: joint.min,
      max: joint.max,
      initial: joint.initial,
    },
  ]),
);

export const ARM_CHANGE_EPSILON = {
  track: 0.5,
  shoulder: 0.5,
  elbow: 0.5,
  pitch: 0.5,
  roll: 0.5,
  clamp: 0.25,
};
