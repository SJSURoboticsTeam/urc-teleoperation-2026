import {
  Drawer,
  List,
  ListItem,
  Typography,
  Box,
  Tabs,
  Tab,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";


export default function MenuPane(drawerOpen, toggleDrawer, navigate, selectedElements, changeElements, VIEW_TABS) {
  return <Drawer
    anchor="left"
    open={drawerOpen}
    onClose={toggleDrawer(false)}
    sx={{
      "& .MuiDrawer-paper": {
        width: 240,
        borderRadius: "12px",
      },
    }}
  >
    <List>
      <Box sx={{ display: { xs: "block", lg: "none" } }}>
        <ListItem>
          <Typography sx={{ color: "black" }} variant="h6">
            VIEWS
          </Typography>
        </ListItem>
        <Tabs
          orientation="vertical"
          // we only track the first path,
          // so truncate /extras/graphs to /extras so it stays highlighted
          value={"/" +
            (location.pathname
              .replace(import.meta.env.BASE_URL, "")
              .split("/")
              .filter(Boolean)[0] || "drive")}
          onChange={(e, value) => navigate(value)}
          role="navigation"
          TabIndicatorProps={{
            style: {
              backgroundColor: "black",
            },
          }}
          sx={{
            borderRight: "3px solid rgba(0,0,0,0.12)",

            "& .MuiTab-root": {
              color: "black",
              transition: "all 0.2s ease",
              minWidth: "unset",
              padding: "6px 12px",
              alignItems: "flex-start",
            },

            "& .MuiTab-root.Mui-selected": {
              color: "black",
              backgroundColor: "rgba(0,0,0,0.24)",
              borderRadius: "8px 0 0 8px",
            },
          }}
        >
          {VIEW_TABS.map(({ label, value }) => (
            <Tab key={value} label={label} value={value} />
          ))}
        </Tabs>
      </Box>
      <ListItem>
        <Typography sx={{ color: "black" }} variant="h6">
          SPLIT SCREEN
        </Typography>
      </ListItem>
      <ListItem>
        <ToggleButtonGroup
          color="primary"
          value={selectedElements}
          exclusive
          onChange={changeElements}
        >
          <ToggleButton value="ui">UI</ToggleButton>
          <ToggleButton value="both">BOTH</ToggleButton>
          <ToggleButton value="cameras">CAMS</ToggleButton>
        </ToggleButtonGroup>
      </ListItem>
    </List>
  </Drawer>;
}