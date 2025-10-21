import { useState } from 'react';
import Button from '@mui/material/Button';

export default function AutonomyControls() {
  const [autonomyEnabled, setAutonomyEnabled] = useState(true);
  return (
      <div>
      <h2 className="text-md font-semibold">Autonomy Controls</h2>
      {(!autonomyEnabled ?
      <Button variant="contained" onClick={() => setAutonomyEnabled(true)}>START AUTONOMY</Button>
      :
      <Button variant="contained" color="error" onClick={() => setAutonomyEnabled(false)}>STOP AUTONOMY</Button>
      )}

      </div>
      )
      };