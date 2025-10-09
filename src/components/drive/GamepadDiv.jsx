import {Paper, Typography, Box, Button} from '@mui/material';
export default function GamepadDiv({gpList, connectedOne, setConnectedOne, name}) {
    return (<div style={{border:'1px solid black', borderRadius:5, padding:5, marginTop: 5}}>
          <Typography variant="h7" sx={{textAlign:'center', marginBottom:1}}>{name} Gamepads</Typography>
          {gpList.length === 0 && <Typography>No gamepads connected</Typography>}
          {gpList.map((gp) => (
            <Box
              key={gp.index}
              sx={{
                border: "1px solid #ccc",
                borderRadius: 1,
                padding: 1,
                marginBottom: 1,
                backgroundColor: connectedOne === gp.index ? "#e0f7fa" : "#f9f9f9",
              }}
            >
              <Typography variant="subtitle1">Gamepad {gp.index}</Typography>
              <Typography variant="body2">ID: {gp.id}</Typography>
              <Button
                variant="outlined"
                size="small"
                sx={{ marginTop: 1 }}
                onClick={() =>
                  setConnectedOne(connectedOne == gp.index ? null : gp.index)
                }
              >
                {connectedOne === gp.index ? "Disconnect" : "Select"}
              </Button>
            </Box>
          ))}
    </div>);
}