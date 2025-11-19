import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export default function AutonomyControls() {
  const [autonomyEnabled, setAutonomyEnabled] = useState(false);
  const [startpopupOpen, startsetPopupOpen] = useState(false);
  const [endpopupOpen, endsetPopupOpen] = useState(false);
  const startAutonomy = () => {
    setAutonomyEnabled(true);
  }

    const endAutonomy = () => {
    setAutonomyEnabled(false);
  }

  return (
      <div>
      <h2 className="text-md font-semibold">Autonomy Controls</h2>
      <StartPopup popupOpen = {startpopupOpen} setPopupOpen = {startsetPopupOpen} startAutonomy = {startAutonomy} />
      <EndPopup popupOpen = {endpopupOpen} setPopupOpen = {endsetPopupOpen} endAutonomy = {endAutonomy} />
      {(!autonomyEnabled ?
      <Button variant="contained" onClick={() => startsetPopupOpen(true)}>START AUTONOMY</Button>
      :
      <Button variant="contained" color="error" onClick={() => endsetPopupOpen(true)}>STOP AUTONOMY</Button>
      )}

      </div>
      )
      };

      export function StartPopup({setPopupOpen, popupOpen, startAutonomy}) {
        
        return (
        <Dialog
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Start Autonomous Mode?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            You are about to start autonomous mode. All controllers will be disconnected!
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPopupOpen(false)}>CANCEL</Button>
          <Button onClick={ () => {setPopupOpen(false); startAutonomy(); }} autoFocus>START AUTONOMY</Button>
        </DialogActions>
      </Dialog>
        )
      };

      export function EndPopup({setPopupOpen, popupOpen, endAutonomy}) {
        
        return (
        <Dialog
        open={popupOpen}
        onClose={() => setPopupOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {"Kill Autonomous Mode?"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            You should only stop autonomous mode in emergency situations. Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPopupOpen(false)}>CANCEL</Button>
          <Button onClick={ () => {setPopupOpen(false); endAutonomy(); }} autoFocus>KILL AUTONOMY</Button>
        </DialogActions>
      </Dialog>
        )
      };