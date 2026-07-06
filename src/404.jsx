import {
  useRouteError,
  isRouteErrorResponse,
} from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
// error imports
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

export default function ErrorPage() {
  const error = useRouteError();
const [showDetails, setShowDetails] = useState(false);

  let title = "Something went wrong";
  let message = "An unexpected error occurred.";
  // log the error
  let stack = ""
  const navigate = useNavigate();

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data || message;
  } else if (error instanceof Error) {
  title = error.name;
  message = error.message;
  stack = error.stack;
}

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: 2,
        backgroundColor: "#121212",
        color: "white",
        textAlign: "center",
        p: 3,
      }}
    >
      <img width="300" src="/sjsu_robotics_logo.png" alt="Logo"/>
      <Typography variant="h3">
        {title}
      </Typography>

      <Typography variant="body1">
        {message}
      </Typography>
 {stack && (
  <Button
    variant="outlined"
    color="inherit"
    onClick={() => setShowDetails(true)}
  >
    Show Error Trace
  </Button>
)}
<Dialog
  open={showDetails}
  onClose={() => setShowDetails(false)}
  maxWidth="md"
  fullWidth
>
  <DialogTitle>{title}</DialogTitle>

  <DialogContent dividers>
    <Box
      component="pre"
      sx={{
        m: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        fontFamily: "monospace",
        fontSize: 13,
      }}
    >
      {stack}
    </Box>
  </DialogContent>

  <DialogActions>
    <Button onClick={() => setShowDetails(false)}>
      Close
    </Button>
  </DialogActions>
</Dialog>

      <Button
        variant="contained"
        onClick={() => navigate("/")}
      >
        Return to Dashboard
      </Button>
    </Box>
  );
}