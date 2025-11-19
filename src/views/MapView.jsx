import "react-resizable/css/styles.css"; // keep global resizable styles if used elsewhere
import Box from "@mui/material/Box";
import Map from "../components/ui/Map";

// Fullscreen map view — map should receive its full height from the parent Box
export default function FullscreenMap() {
  // Let the parent (App) control the viewport height. Use flex:1 so Map fills available space.
  return (
    <Box
      component="main"
      sx={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}
    >
      <Map />
    </Box>
  );
}
