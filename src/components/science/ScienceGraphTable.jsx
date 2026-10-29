import "react-resizable/css/styles.css";
import { Box, Paper, Tooltip, Typography } from "@mui/material";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";

// Presentation only. A vial without an entry uses the chart's default colour.
const VIAL_COLORS = { purple: "#9c27b0", blue: "#1976d2", red: "#d32f2f" };

const SATURATED_STYLE = { backgroundColor: "#bdbdbd", color: "#212121" };
const IN_RANGE_STYLE = { backgroundColor: "#4caf50" };
const OUT_OF_RANGE_STYLE = { backgroundColor: "#f44336" };

const vialLabel = (name) => `${name.charAt(0).toUpperCase()}${name.slice(1)} Vial`;

// null (not NaN, not a string) for anything that isn't a usable number, so the chart skips it
const toNumberOrNull = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

// Presentational only: the backend computes absorbance and flags saturation, and owns
// the wavelength and vial lists. Renders an empty chart and table when `site` is undefined.
export default function ScienceGraphTable({ site, wavelengths = [], vials = [] }) {
  const vialData = site?.spectro?.vials ?? {};
  const clearSaturated = site?.spectro?.clear?.saturated ?? [];

  const absorbanceAt = (name, index) =>
    toNumberOrNull(vialData[name]?.absorbance?.[index]);

  // a reading is unreliable if the clear reference or the vial itself is saturated
  const isSaturated = (name, index) =>
    clearSaturated.includes(index) || !!vialData[name]?.saturated?.includes(index);

  // grey takes precedence over green/red; a null absorbance gets no colour
  const cellStyle = (value, saturated) => {
    if (saturated) return SATURATED_STYLE;
    if (value === null) return {};
    return value >= 0.1 && value <= 1 ? IN_RANGE_STYLE : OUT_OF_RANGE_STYLE;
  };

  return (
    <div className="flex flex-row gap-4 mb-4" style={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ width: "65%", height: 450 }}>
        <LineChart
          series={vials.map((name) => ({
            id: name,
            label: vialLabel(name),
            color: VIAL_COLORS[name],
            // saturated points are unreliable, so they leave a gap instead of being plotted
            data: wavelengths.map((_, index) =>
              isSaturated(name, index) ? null : absorbanceAt(name, index),
            ),
          }))}
          xAxis={[
            {
              scaleType: "point",
              data: wavelengths,
              label: "Wavelength (nm)",
            },
          ]}
          yAxis={[{ label: "Absorbance", width: 45 }]}
          margin={{ left: 60, bottom: 40 }}
        />
      </Box>

      <Box sx={{ width: "35%", minHeight: 300, mt: 5, ml: 3 }}>
        <TableContainer component={Paper}>
          <Table size="small" aria-label="science absorbance table">
            <TableHead>
              <TableRow>
                <TableCell>wavelength (nm)</TableCell>
                {vials.map((name) => (
                  <TableCell key={name} align="right">
                    {name}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {wavelengths.map((wavelength, index) => {
                const clearIsSaturated = clearSaturated.includes(index);
                return (
                  <TableRow key={wavelength}>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={clearIsSaturated ? SATURATED_STYLE : {}}
                    >
                      {wavelength}
                    </TableCell>
                    {vials.map((name) => {
                      const value = absorbanceAt(name, index);
                      const saturated = isSaturated(name, index);
                      // "---" is only for a missing (null) value; greyed cells still show theirs
                      const text = value === null ? "---" : value.toFixed(3);
                      return (
                        <TableCell
                          key={name}
                          align="right"
                          sx={cellStyle(value, saturated)}
                        >
                          {saturated ? (
                            <Tooltip
                              title={
                                clearIsSaturated
                                  ? "Saturated: clear reference is at its maximum, so absorbance is unreliable"
                                  : "Saturated: sensor is at its maximum, so absorbance is unreliable"
                              }
                            >
                              <span>{text}</span>
                            </Tooltip>
                          ) : (
                            text
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
          <Box sx={{ width: 14, height: 14, flexShrink: 0, ...SATURATED_STYLE }} />
          <Typography variant="caption">
            Saturated: value shown but unreliable (not plotted)
          </Typography>
        </Box>
      </Box>
    </div>
  );
}
