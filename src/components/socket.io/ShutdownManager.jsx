import {
  Button,
  Dialog,
  DialogTitle,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Box,
} from "@mui/material";
import { robotsocket, basesocket } from "./socket";

// Read shared connection state for shutdown command routing. Edit by Sunny_100226
import { useConnectionStatus } from "../../contexts/ConnectionContext";

import { useState } from "react";

export default function ShutdownManager() {
  // Use centralized status to select the available shutdown socket. Edit by Sunny_100226
  const {
    robotConnected: serverConnected,
    baseConnected,
  } = useConnectionStatus();

  const [popupOpen, setPopupOpen] = useState(false); // array with booleans [robot to kill, base to kill]
  const [checked, setChecked] = useState([true, false, false]);

  function openPopup() {
    setPopupOpen(true);
  }
  function sendshutdownCommand() {
    // by the time this runs we know a server is available
    setPopupOpen(false);
    //console.log(checked);
    if (checked[0] === true) {
      console.log("Shutting down cameras");
      if (baseConnected) {
        basesocket.emit("shutdown_cameras", () => {
          console.log("Done!");
        });
      } else {
        robotsocket.emit("shutdown_cameras", () => {
          console.log("Done!");
        });
      }
    }

    if (checked[1] === true) {
      console.log("Shutting down server");
      if (baseConnected) {
        basesocket.emit("shutdown_server", () => {
          console.log("Done!");
        });
      } else {
        robotsocket.emit("shutdown_server", () => {
          console.log("Done!");
        });
      }
    }
    if (checked[2] === true) {
      console.log("Shutting down base pi");
      if (baseConnected) {
        basesocket.emit("shutdown_basepi", () => {
          console.log("Done!");
        });
      } else {
        robotsocket.emit("shutdown_basepi", () => {
          console.log("Done!");
        });
      }
    }
  }

  const handleAll = (event) => {
    setChecked([
      event.target.checked,
      event.target.checked,
      event.target.checked,
    ]);
  };

  const handleChange0 = (event) => {
    setChecked([event.target.checked, checked[1], checked[2]]);
  };

  const handleChange1 = (event) => {
    setChecked([checked[0], event.target.checked, checked[2]]);
  };

  const handleChange2 = (event) => {
    setChecked([checked[0], checked[1], event.target.checked]);
  };

  return (
    <div>
      <Button
        color="error"
        onClick={openPopup}
        variant="contained"
        disabled={!baseConnected && !serverConnected}
        sx={{ width: 280 }}
      >
        POWER OFF
      </Button>
      <Dialog
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"What to shutdown?"}</DialogTitle>
        <Box sx={{ display: "flex", flexDirection: "column", ml: 5 }}>
          <FormControlLabel
            label="All"
            control={
              <Checkbox
                checked={checked.every(Boolean)}
                indeterminate={checked.some(Boolean) && !checked.every(Boolean)}
                onChange={handleAll}
              />
            }
          />
          <FormControlLabel
            label="Cameras"
            sx={{ ml: 2 }}
            control={<Checkbox checked={checked[0]} onChange={handleChange0} />}
          />
          <FormControlLabel
            label="Jetson"
            sx={{ ml: 2 }}
            control={<Checkbox checked={checked[1]} onChange={handleChange1} />}
          />
          <FormControlLabel
            label="Base PI"
            sx={{ ml: 2 }}
            control={<Checkbox checked={checked[2]} onChange={handleChange2} />}
          />
        </Box>
        <DialogActions>
          {/* Close without action */}
          <Button onClick={() => setPopupOpen(false)}>CANCEL</Button>

          {/* Confirm and start autonomy */}
          <Button
            onClick={() => {
              sendshutdownCommand();
            }}
            autoFocus
            color="error"
            disabled={!baseConnected && !serverConnected}
          >
            SHUTDOWN
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
