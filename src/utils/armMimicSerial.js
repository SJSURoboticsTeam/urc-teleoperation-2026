// arm mimic serial protocol (v1)
//
// packet size: 6 bytes
// unit: degrees
// range per joint: 0-180
//
// byte order:
// [0] track
// [1] shoulder
// [2] elbow
// [3] pitch
// [4] roll
// [5] clamp
//
// NOTE:
// this schema is temporary and mirrors the current arm mimic from firmware
// some joints have ranges outside 0-180 degrees
// future versions may require per-joint scaling/mapping
export const ARM_MIMIC_PACKET_SIZE = 6;

export const ARM_MIMIC_JOINT_ORDER = [
  "track",
  "shoulder",
  "elbow",
  "pitch",
  "roll",
  "clamp",
];

// clamp values to the byte range currently supported by arm mimic
// firmware expects whole-degree values between 0 and 180
function clampByteDegrees(value) {
  return Math.min(180, Math.max(0, Math.round(Number(value) || 0)));
}

// convert a 6-byte arm mimic packet into arm commands
export function parseArmMimicBytes(bytes) {
  if (!bytes || bytes.length < ARM_MIMIC_PACKET_SIZE) {
    return null;
  }

  const commands = {};

  ARM_MIMIC_JOINT_ORDER.forEach((joint, index) => {
    commands[joint] = clampByteDegrees(bytes[index]);
  });

  return commands;
}

// convert arm values into a 6-byte packet for transmission back to arm mimic
export function encodeArmMimicBytes(armValues) {
  return Uint8Array.from(
    ARM_MIMIC_JOINT_ORDER.map((joint) => clampByteDegrees(armValues?.[joint])),
  );
}
