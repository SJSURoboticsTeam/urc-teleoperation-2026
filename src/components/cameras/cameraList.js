// Camera feed definitions shared by CameraPane (to render) and SplitView (to
// validate layouts restored from localStorage).
export const DEFAULT_CAMERA = "Standby";

const URL =
  import.meta.env.MODE === "prod" ? "192.168.1.2" : window.location.hostname;

export const CAMERA_OPTIONS = [
  {
    value: "Standby",
    mediatype: "image",
    name: "Standby",
    url: `${import.meta.env.BASE_URL}mars.jpg`,
    allowed: true,
  },
  {
    value: "mast",
    mediatype: "iframe",
    name: "Mast",
    url: `http://${URL}:8889/mast/`,
    allowed: true,
  },
  {
    value: "wheels",
    mediatype: "iframe",
    name: "Wheels",
    url: `http://${URL}:8889/wheels/`,
    allowed: true,
  },
  {
    value: "scout",
    mediatype: "iframe",
    name: "Scout",
    url: `http://${URL}:8889/scout/`,
    allowed: true,
  },
  {
    value: "feet",
    mediatype: "iframe",
    name: "Feet",
    url: `http://${URL}:8889/feet/`,
    allowed: true,
  },
  {
    value: "module1",
    mediatype: "iframe",
    name: "Arm / Science",
    url: `http://${URL}:8889/module1/`,
    allowed: true,
  },
  {
    value: "module2",
    mediatype: "iframe",
    name: "End Effector",
    url: `http://${URL}:8889/module2/`,
    allowed: true,
  },
];

// Returns value if it names a selectable camera, otherwise DEFAULT_CAMERA.
// Guards against stale saved values (e.g. the old "Mast Camera" label).
export function resolveCameraValue(value) {
  return CAMERA_OPTIONS.some((cam) => cam.allowed && cam.value === value)
    ? value
    : DEFAULT_CAMERA;
}
