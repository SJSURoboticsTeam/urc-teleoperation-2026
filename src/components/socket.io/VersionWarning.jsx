import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import SoftwareVersionDetails from "./SoftwareVersionDetails";

export default function VersionWarning({ versions }) {
  const [dismissedCheckId, setDismissedCheckId] = useState(null);
  const open = (versions.mismatch || versions.unverifiable)
    && dismissedCheckId !== versions.compatibilityCheckId;
  const dismissCurrentCheck = () => setDismissedCheckId(versions.compatibilityCheckId);

  return (
    <Dialog fullScreen open={open} onClose={dismissCurrentCheck} aria-labelledby="version-warning-title">
      <DialogTitle id="version-warning-title" color="warning.main">
        {versions.mismatch ? "Software versions are out of sync" : "Software compatibility cannot be verified"}
      </DialogTitle>
      <DialogContent>
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
        <SoftwareVersionDetails versions={versions} />
        <Typography sx={{ mt: 3 }}>
          You can continue anyway. Versions will be checked again on the next
          connection or version change.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={dismissCurrentCheck}>Continue anyway</Button>
      </DialogActions>
    </Dialog>
  );
}
