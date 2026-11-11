import {
  Popper,
  Paper,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import SettingsInputAntennaIcon from "@mui/icons-material/SettingsInputAntenna";
import VideocamIcon from "@mui/icons-material/Videocam";
import { useLocation, useNavigate } from "react-router-dom";


const GRAPH_OPTIONS = [
  { label: "Antennas", path: "/graphs/antennas", icon: <SettingsInputAntennaIcon /> },
  { label: "Cameras", path: "/graphs/cameras", icon: <VideocamIcon /> },
];

export default function GraphsPane({
  anchorEl,
  open,
  onMouseEnter,
  onMouseLeave,
  onSelect,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Popper
      open={open && Boolean(anchorEl)}
      anchorEl={anchorEl}
      placement="bottom-start"
      sx={{ zIndex: (theme) => theme.zIndex.appBar + 1 }}
    >
      <Paper
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        sx={{
          bgcolor: "white",
          color: "black",
          border: "1px solid gray",
          borderRadius: "12px",
          minWidth: 180,
        }}
      >
        <MenuList>
          {GRAPH_OPTIONS.map(({ label, path, icon }) => (
            <MenuItem
              key={path}
              selected={pathname.startsWith(path)}
              onClick={() => {
                navigate(path);
                onSelect();
              }}
            >
              <ListItemIcon>{icon}</ListItemIcon>
              <ListItemText>{label}</ListItemText>
            </MenuItem>
          ))}
        </MenuList>
      </Paper>
    </Popper>
  );
}