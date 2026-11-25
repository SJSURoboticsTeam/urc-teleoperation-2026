import { useState } from "react";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Toolbar,
  Typography,
} from "@mui/material";
import SoftwareVersionDetails from "./SoftwareVersionDetails";

export default function VersionWarning({ versions }) {
  const [dismissedWarning, setDismissedWarning] = useState(null);
  const isDismissed = dismissedWarning?.checkId === versions.compatibilityCheckId
    && (!versions.unverifiable || dismissedWarning.unverifiable);
  const open = (versions.mismatch || versions.unverifiable)
    && !isDismissed;
  const dismissCurrentCheck = () => setDismissedWarning({
    checkId: versions.compatibilityCheckId,
    unverifiable: versions.unverifiable,
  });

  if (!open) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
      }}
    >
      {/* Match the top bar's responsive height without blocking its controls. */}
      <Toolbar aria-hidden="true" sx={{ flexShrink: 0 }} />
      <Paper
        square
        elevation={0}
        role="region"
        aria-labelledby="version-warning-title"
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          pointerEvents: "auto",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 720, mx: "auto", my: "auto", py: 3, flexShrink: 0, textAlign: "center" }}>
          <DialogTitle id="version-warning-title" color="warning.main">
            {versions.mismatch ? "Software versions are out of sync" : "Software compatibility cannot be verified"}
          </DialogTitle>
          <DialogContent sx={{ flex: "none", overflow: "visible" }}>
            {versions.mismatch && (
              <Typography sx={{ mb: 2 }}>
                These components are running different commits. Update them to the
                same commit to avoid compatibility problems.
              </Typography>
            )}
            {versions.unverifiable && (
              <Typography sx={{ mb: 2 }}>
                Version information is unavailable for a connected component. Its
                compatibility cannot be verified.
              </Typography>
            )}
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <SoftwareVersionDetails versions={versions} />
            </Box>
            <Typography sx={{ mt: 3 }}>
              You can continue anyway. Versions will be checked again on the next
              connection or version change.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ justifyContent: "center" }}>
            <Button variant="contained" onClick={dismissCurrentCheck}>Continue anyway</Button>
          </DialogActions>
        </Box>
      </Paper>
    </Box>
  );
}
