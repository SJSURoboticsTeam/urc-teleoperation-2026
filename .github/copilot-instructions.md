# Copilot Cloud Agent Instructions

## Repository overview
- This is a monorepo with 3 runtime parts:
  - `src/` + root Vite config: React 19 teleoperation frontend.
  - `server/`: Python Socket.IO rover backend (default port `4000`).
  - `base-pi/`: Python Socket.IO base-station backend (default port `4001`).
- Frontend routes are defined in `/home/runner/work/urc-teleoperation-2026/urc-teleoperation-2026/src/main.jsx`.
- Global app state providers are composed in `/home/runner/work/urc-teleoperation-2026/urc-teleoperation-2026/src/views/App.jsx`.
- Frontend socket host/port behavior is in `/home/runner/work/urc-teleoperation-2026/urc-teleoperation-2026/src/components/socket.io/socket.jsx`.

## Fast local workflow (from repo root)
- Install JS deps: `npm ci`
- Run frontend without backend auto-connect (preferred for UI work): `npm run lite`
- Run normal frontend dev mode: `npm run dev`
- Build frontend: `npm run build`
- Run frontend smoke tests: `npm run playwright`
- Run frontend lint (known noisy): `npm run lint`
- Run frontend lint: `npm run lint-quiet`

## Python backend workflow
- Rover backend (`server/`):
  - Install deps: `pip install -r server/requirements.txt`
  - Compile check: `python -m compileall server`
  - Smoke run: `timeout 10s python server/py_server.py`
- Base-pi backend (`base-pi/`):
  - Install deps: `pip install -r base-pi/requirements.txt`
  - Compile check: `python -m compileall base-pi`
  - Smoke run (offline mode preferred): `timeout 10s python base-pi/py_server.py --offline`

## CI/test expectations that can break easily
- CI workflow is in `/home/runner/work/urc-teleoperation-2026/urc-teleoperation-2026/.github/workflows/test.yml`.
- Python smoke checks expect startup logs to include `Server Starting...` in both:
  - `/home/runner/work/urc-teleoperation-2026/urc-teleoperation-2026/server/py_server.py`
  - `/home/runner/work/urc-teleoperation-2026/urc-teleoperation-2026/base-pi/py_server.py`
- Frontend Playwright tests (`/home/runner/work/urc-teleoperation-2026/urc-teleoperation-2026/tests/smoke.spec.ts`) expect:
  - All listed routes load successfully.
  - No browser console errors.
  - `Teleoperations` header visible.


## Change guidance
- Keep edits scoped to one subsystem when possible (`src/`, `server/`, or `base-pi/`).
- For frontend-only changes, validate at minimum with `npm run build` and relevant Playwright/lint checks.
- For backend Python changes, run compile and smoke commands for the touched backend.
- Prefer `npm run lite` while developing frontend features that do not require live rover/base connections.
- Do not commit any `.env` or credentials (base-pi README references SSH secrets setup).

## Known project caveats
- Gamepad/controller API is not supported in Firefox (from root `README.md`); use Chromium-based browsers for controller features.
- Socket host selection depends on Vite mode:
  - `prod`/`production`: hardcoded rover/base LAN IPs.
  - other modes: current browser hostname.

## Errors encountered during onboarding
- No repository/tooling errors were encountered while surveying this repository for onboarding.
- Workaround guidance if environment issues appear:
  - If Playwright browser is missing, run: `npx playwright install --with-deps chromium`
  - If frontend deps are missing/outdated, rerun: `npm ci`
  - If Python import errors occur, reinstall backend deps from the relevant `requirements.txt`

## Copilot PR review guidance
- Don't obsess over security concerns since this is a student club project, where everyone is a either a developer or trusted end user. Focus on usability, maintainability, and correctness.
- Ensure nothing existing is broken by changes.
- Ensure new features are usable and maintainable.
- If something is complicated, propose adding comments where appropriate. Or propose a simpler solution if possible.


