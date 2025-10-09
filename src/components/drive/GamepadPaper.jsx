import {Paper, Typography, Box, Button} from '@mui/material';
export default function GamepadPaper({gpList, connectedOne, setConnectedOne}) {
    return (<Paper sx={{textAlign:'center', maxHeight:150,width:400,overflowX:'hidden',overflowY:'auto',left:'50%',transform: 'translateX(-50%)',position:'absolute',top:'100%', zIndex:1300, marginTop: 1, padding: 2}}>
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
    </Paper>);
}