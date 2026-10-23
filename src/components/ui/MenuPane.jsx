import { Drawer } from "@mui/material";
import SettingsPane from "../ui/SettingsPane.jsx";

export default function MenuPane(props) {
  return (
    <Drawer
      anchor="left"
      open={props.drawerOpen}
      onClose={props.toggleDrawer(false)}
      sx={{
        "& .MuiDrawer-paper": {
          width: 240,
          borderRadius: "12px",
        },
      }}
    >
      <SettingsPane {...props} />
    </Drawer>
  );
}
