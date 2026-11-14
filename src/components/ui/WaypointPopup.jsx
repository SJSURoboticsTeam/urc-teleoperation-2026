import { useState } from "react";
import { Box, Button, Divider, IconButton, NativeSelect, TextField, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { distanceAndHeading, compassDirection } from "../../lib/geo";

// Editable POI name. Saves on Enter or when focus leaves; a blank name reverts instead of saving.
function PoiNameField({ name, onRename }) {
  const [draft, setDraft] = useState(name);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setDraft(name);
  };

  return (
    <TextField
      variant="standard"
      size="small"
      fullWidth
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        // Keep typing out of the map's keyboard shortcuts (e.g. +/- zoom)
        event.stopPropagation();
        if (event.key === "Enter") event.target.blur();
      }}
      slotProps={{ htmlInput: { "aria-label": "POI name", style: { fontWeight: 700, fontSize: "0.875rem" } } }}
    />
  );
}

// Popup shown when a waypoint pin is clicked: compare it with the rover, base, or another pin,
// set it as a science site, or delete it. POIs can also be renamed here.
// Kept compact, with delete at the top, because short maps on laptop screens cut off the bottom of tall popups.
export default function WaypointPopup({ waypoint, waypoints, robotCoordinates, baseCoordinates, scienceLocked, onSetScienceSite, onRenamePoi, onDelete }) {
  const isPoi = waypoint.type === "poi";
  // Science sites follow the same lock as their other buttons; POIs and autonomy locations can always be edited
  const deleteLocked = waypoint.type === "science" && scienceLocked;
  // Science sites are GPS readings taken in the field and hard to redo, so deleting one asks first
  const confirmDelete = waypoint.type === "science";
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [compareId, setCompareId] = useState("rover");

  // Rover and base only count while their GPS is live, so stale positions aren't compared
  const compareOptions = [
    { id: "rover", name: "Rover", point: robotCoordinates.receive ? robotCoordinates : null },
    { id: "base", name: "Base", point: baseCoordinates.receive ? baseCoordinates : null },
    ...waypoints
      .filter((wp) => wp.id !== waypoint.id)
      .map((wp) => ({ id: wp.id, name: wp.name, point: wp })),
  ];
  // Fall back to the rover if the compared pin was removed
  const compare = compareOptions.find((option) => option.id === compareId) ?? compareOptions[0];
  // Heading is from the compared point toward this pin, i.e. which way to go to reach it
  const result = compare.point ? distanceAndHeading(compare.point, waypoint) : null;

  return (
    <Box sx={{ width: 240, display: "flex", flexDirection: "column", gap: 0.5 }}>
      {/* Right padding keeps the delete button clear of the popup's close (×) button.
          The delete confirmation replaces this row so the popup doesn't grow and get cut off. */}
      {confirmingDelete ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pr: 2, "& .MuiButton-root": { minWidth: 0, px: 0.75, fontSize: "0.7rem" } }}>
          <Typography variant="body2" fontWeight="bold" color="error" noWrap sx={{ flex: 1 }}>Delete {waypoint.name}?</Typography>
          <Button size="small" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
          {/* Also disabled if the lock turns on while confirming */}
          <Button size="small" color="error" variant="contained" disabled={deleteLocked} onClick={onDelete}>Delete</Button>
        </Box>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pr: 2 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {isPoi
              ? <PoiNameField name={waypoint.name} onRename={onRenamePoi} />
              : <Typography variant="body2" fontWeight="bold" noWrap>{waypoint.name}</Typography>}
          </Box>
          <Tooltip title={`Delete ${waypoint.name}`}>
            {/* The span lets the tooltip show while the button is disabled */}
            <span>
              <IconButton size="small" color="error" aria-label={`Delete ${waypoint.name}`} disabled={deleteLocked} onClick={confirmDelete ? () => setConfirmingDelete(true) : onDelete}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ mt: -0.5 }}>
        {waypoint.lat.toFixed(6)}, {waypoint.long.toFixed(6)}
      </Typography>

      <Divider />

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>Compare with</Typography>
        <NativeSelect
          value={compare.id}
          onChange={(event) => setCompareId(event.target.value)}
          inputProps={{ "aria-label": "Compare with" }}
          sx={{ flex: 1, fontSize: "0.85rem" }}
        >
          {compareOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </NativeSelect>
      </Box>
      <Typography variant="body2">
        {result
          ? `${compare.name} → ${waypoint.name}: ${result.distanceMeters.toFixed(1)} m, ${result.headingDegrees.toFixed(1)}° ${compassDirection(result.headingDegrees)}`
          : `${compare.name}: no GPS signal`}
      </Typography>

      <Divider />

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap", mr: 0.5 }}>Set as</Typography>
        {[1, 2, 3].map((site) => (
          <Button
            key={site}
            size="small"
            variant="outlined"
            disabled={scienceLocked || waypoint.scienceSite === site}
            onClick={() => onSetScienceSite(site)}
            sx={{ minWidth: 0, flex: 1, fontSize: "0.75rem", py: 0.25 }}
          >
            Site {site}
          </Button>
        ))}
      </Box>
      {scienceLocked && (
        <Typography variant="caption" color="error">
          Science sites are locked while autonomy or Soft Stop is active.
        </Typography>
      )}
    </Box>
  );
}
