import {
  useRouteError,
  isRouteErrorResponse,
} from "react-router-dom";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  let title = "Something went wrong";
  let message = "An unexpected error occurred.";
  const navigate = useNavigate();

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    message = error.data || message;
  } else if (error instanceof Error) {
    message = error.message;
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

      <Button
        variant="contained"
        onClick={() => navigate("/")}
      >
        Return to Dashboard
      </Button>
    </Box>
  );
}