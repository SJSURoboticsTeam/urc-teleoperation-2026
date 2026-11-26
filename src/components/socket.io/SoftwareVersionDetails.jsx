import { Box, Typography } from "@mui/material";

export default function SoftwareVersionDetails({ versions }) {
  const components = [
    ["Frontend", versions.frontend],
    ["Robot", versions.robot],
    ["Base", versions.base],
  ];

  return (
    <Box sx={{ display: "grid", gap: 1, color: "text.primary", textAlign: "left" }}>
      {components.map(([name, { status, version }]) => (
        <Box key={name} sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
          <Typography variant="body2" fontWeight={700}>
            {name}
            {status === "disconnected" ? " — Disconnected" : status === "checking" ? " — Checking…" : ""}
          </Typography>
          <Typography variant="body2" title={version?.sha || undefined}>
            SHA: {version?.sha?.slice(0, 8) || "Unknown"}
            {" · "}Branch: {version?.branch || "Unknown"}
          </Typography>
          <Typography variant="body2">Commit: {version?.message ?? "Unknown"}</Typography>
        </Box>
      ))}
    </Box>
  );
}
