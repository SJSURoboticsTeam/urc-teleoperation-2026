import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Navigate } from "react-router-dom";

// key files
import App from "./views/App";
import ErrorPage from "./404";

// actual panes to route between
import DriveComponents from "./views/DriveView";
import ArmView from "./views/ArmView";
import ScienceView from "./views/ScienceView";
import AutonomyView from "./views/AutonomyView";
import ExtrasView from "./views/ExtrasView";
// extras panes
import {Graphs, Files, SpeedTestView}  from "./views/ExtrasView";

const approuter = createBrowserRouter([
  {
    path: "/",
    // the router stays at the top, but only embeds at {children}
    // main.jsx (router config) => app.jsx (main file, adds header with topappbar.jsx)
    // => splitview.jsx (two-pane) => children (actual router selector)
    element: <App />,
    // shows our 404 page
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <Navigate to="/drive" replace />,
      },
      {
        path: "arm",
        element: <ArmView />,
      },
      {
        path: "drive",
        element: <DriveComponents />,
      },
      {
        path: "science",
        element: <ScienceView />,
      },
      {
        path: "autonomy",
        element: <AutonomyView />,
      },
      {
        path: "extras",
        element: <ExtrasView />,
        children: [
                {
        index: true,
        element: <Navigate to="/extras/graphs" replace />,
      },
          {
            index: true,
            element: <Graphs />,
          },
          {
            path: "graphs",
            element: <Graphs />,
          },
          {
            path: "files",
            element: <Files />,
          },
          {
            path: "speedtest",
            element: <SpeedTestView />,
          },
        ],
      },
    ],
  },
]);

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { SnackbarProvider } from "notistack";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <SnackbarProvider maxSnack={5}>
      <RouterProvider router={approuter} />
    </SnackbarProvider>
  </StrictMode>,
);
