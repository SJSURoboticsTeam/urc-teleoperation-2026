import { useState } from "react";
import { Box, Button, Divider, NativeSelect, TextField, Typography } from "@mui/material";
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
// and copy its location into a science site. POIs can also be renamed and deleted here.
export default function WaypointPopup({ waypoint, waypoints, robotCoordinates, baseCoordinates, scienceLocked, onSetScienceSite, onRenamePoi, onDeletePoi }) {
  const isPoi = waypoint.type === "poi";
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
    <Box sx={{ minWidth: 220, display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Box>
        {isPoi
          ? <PoiNameField name={waypoint.name} onRename={onRenamePoi} />
          : <Typography variant="body2" fontWeight="bold">{waypoint.name}</Typography>}
        <Typography variant="caption" color="text.secondary">
          {waypoint.lat.toFixed(6)}, {waypoint.long.toFixed(6)}
        </Typography>
      </Box>

      <Divider />

      <Box>
        <Typography variant="caption" color="text.secondary">Compare with</Typography>
        <NativeSelect
          fullWidth
          value={compare.id}
          onChange={(event) => setCompareId(event.target.value)}
          inputProps={{ "aria-label": "Compare with" }}
          sx={{ fontSize: "0.85rem" }}
        >
          {compareOptions.map((option) => (
            <option key={option.id} value={option.id}>{option.name}</option>
          ))}
        </NativeSelect>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {result
            ? `${compare.name} → ${waypoint.name}: ${result.distanceMeters.toFixed(1)} m, ${result.headingDegrees.toFixed(1)}° ${compassDirection(result.headingDegrees)}`
            : `${compare.name}: no GPS signal`}
        </Typography>
      </Box>

      <Divider />

      <Box>
        <Typography variant="caption" color="text.secondary">Set as science site</Typography>
        <Box sx={{ display: "flex", gap: 0.5, mt: 0.25 }}>
          {[1, 2, 3].map((site) => (
            <Button
              key={site}
              size="small"
              variant="outlined"
              disabled={scienceLocked || waypoint.scienceSite === site}
              onClick={() => onSetScienceSite(site)}
              sx={{ minWidth: 0, flex: 1, fontSize: "0.75rem" }}
            >
              Site {site}
            </Button>
          ))}
        </Box>
        {scienceLocked && (
          <Typography variant="caption" color="error">
            Locked while autonomy or Soft Stop is active.
          </Typography>
        )}
      </Box>

      {isPoi && (
        <>
          <Divider />
          <Button size="small" color="error" onClick={onDeletePoi}>Delete POI</Button>
        </>
      )}
    </Box>
  );
}
