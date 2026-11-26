import { useLayoutEffect, useRef } from "react";
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
  const warningRef = useRef(null);
  const titleRef = useRef(null);
  const { open, mismatch, unverifiable, dismiss } = versions.warning;

  useLayoutEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement;
    const warning = warningRef.current;
    const root = document.getElementById("root");
    const coveredElements = new Set();
    const disableCoveredContent = (element) => {
      if (element === warning || element.matches("[data-version-warning-accessible]")) return;
      if (element.contains(warning) || element.querySelector("[data-version-warning-accessible]")) {
        Array.from(element.children).forEach(disableCoveredContent);
      } else if (!element.inert) {
        element.inert = true;
        coveredElements.add(element);
      }
    };

    titleRef.current.focus({ preventScroll: true });
    disableCoveredContent(root);
    const observer = new MutationObserver(() => disableCoveredContent(root));
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      coveredElements.forEach((element) => { element.inert = false; });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return (
    <Box
      ref={warningRef}
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
      }}
    >
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
          <DialogTitle ref={titleRef} tabIndex={-1} id="version-warning-title" color="warning.main">
            {mismatch ? "Software versions are out of sync" : "Software compatibility cannot be verified"}
          </DialogTitle>
          <DialogContent sx={{ flex: "none", overflow: "visible" }}>
            {mismatch && (
              <Typography sx={{ mb: 2 }}>
                These components are running different commits. Update them to the
                same commit to avoid compatibility problems.
              </Typography>
            )}
            {unverifiable && (
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
            <Button variant="contained" onClick={dismiss}>Continue anyway</Button>
          </DialogActions>
        </Box>
      </Paper>
    </Box>
  );
}
