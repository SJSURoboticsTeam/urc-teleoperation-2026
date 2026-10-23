import { Drawer, Tabs, Tab } from "@mui/material";
import { useState } from "react";
import SettingsPane from "../ui/SettingsPane.jsx";
import NotesPane from "../notes/NotesPane.jsx";

export default function MenuPane(props) {
  const [activePane, setActivePane] = useState("settings");

  const handleChange = (event, newValue) => {
    setActivePane(newValue);
  };

  return (
    <Drawer
      anchor="left"
      open={props.drawerOpen}
      onClose={props.toggleDrawer(false)}
      sx={{
        "& .MuiDrawer-paper": {
          width: activePane == "notes" ? "min(100vw, 420px)" : 240,
          borderRadius: "12px",
        },
      }}
    >
      <Tabs value={activePane} onChange={handleChange}>
        <Tab label="Settings" value="settings"></Tab>
        <Tab label="Notes" value="notes"></Tab>
      </Tabs>
      {activePane == "settings" && <SettingsPane {...props} />}
      {activePane == "notes" && <NotesPane />}
    </Drawer>
  );
}
