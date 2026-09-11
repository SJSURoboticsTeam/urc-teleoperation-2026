import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { Box } from "@mui/system";
import GitHubIcon from "@mui/icons-material/GitHub";

const demoFeatures = [
  { label: "Operator Interface, Panes, Split Screen", supported: true },
  {
    label: "Connect a Drive controller (Xbox/PS/Standard controller) ",
    supported: true,
  },
  { label: "Connect a Arm Controller (Logitech Extreme) ", supported: true },
  { label: "Connect to the backends, send commands", supported: false },
  {
    label: "Metrics, Serial, Status/State Pane, Peripheral Manager",
    supported: false,
  },
  { label: "Camera streaming", supported: false },
];

export default function DemoPopup() {
  const [open, setOpen] = useState(true);

  if (import.meta.env.MODE !== "demo") return null;

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      aria-labelledby="demo-dialog-title"
      aria-describedby="demo-dialog-description"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="demo-dialog-title">Mission Control Demo</DialogTitle>
      <DialogContent dividers>
        <Box id="demo-dialog-description" sx={{ mb: 1 }}>
          Welcome to the Mission Control Demo. Since there is no backend for
          this to connect to, here is what you can explore:
        </Box>
        <List disablePadding>
          {demoFeatures.map(({ label, supported }) => (
            <ListItem key={label} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {supported ? (
                  <CheckCircleOutlineIcon color="success" />
                ) : (
                  <CancelOutlinedIcon color="error" />
                )}
              </ListItemIcon>
              <ListItemText primary={label} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
      <Divider />

      <DialogActions>
        <Button
          target="_blank"
          href="https://github.com/SJSURoboticsTeam/urc-teleoperation-2026"
          startIcon={<GitHubIcon />}
          sx={{ mr: "auto" }}
        >
          View the source code
        </Button>
        <Button onClick={() => setOpen(false)} autoFocus>
          Begin
        </Button>
      </DialogActions>
    </Dialog>
  );
}
