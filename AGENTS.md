# Agent instructions

## Working agreements

- Do not commit, merge, push, or rewrite Git history unless explicitly instructed. Permission to edit code does not imply permission to perform these Git actions.
- Inspect the working tree before editing. Preserve unrelated user changes, including staged and untracked files; do not overwrite or revert them.
- Present conflicting architecture options and their tradeoffs to the user before implementing a choice. The user chooses the architecture.
- Get approval before undertaking a refactor. An explicit request to refactor already authorizes that scope; do not ask again unless the scope or architecture changes.
- Ask questions when goals or requirements are unclear. Once the user has chosen an approach, carry out the authorized work.
- Prioritize usability, maintainability, and functionality for this student club project on a trusted network. Avoid speculative security work outside the requested scope. Do not add credentials or `.env` contents to changes or output.

## Code generation practices

- Preserve existing behavior unless the requested change explicitly alters it.
- Prefer simple, readable, localized changes. Avoid unrelated refactors, formatting churn, and unnecessary abstractions.
- Add concise comments to complex functions and non-obvious logic so other readers and future agents can understand the purpose and constraints.
- Keep the rover and base backends consistent where they perform equivalent work, while retaining backend-specific features.
- Keep edits within the affected subsystem when possible. Update all affected consumers when changing a shared data structure or frontend/backend contract.

## Control and connection behavior

- Keep blocking serial operations, synchronous sleeps, and other slow work off the asyncio event loop. Preserve necessary operation ordering when moving work to threads.
- Ensure stale reads, writes, and failures cannot close or invalidate a newer connection. Serialize connection changes where needed.
- Preserve Socket.IO synchronization and reconnection handlers. Register frontend listeners in effects with matching cleanup.
- Preserve control ownership, soft-stop handling, command timing, and the distinction between live command values and display state unless explicitly changing them.

## Repository overview

This monorepo has three runtime parts:

- `src/` and the root Vite configuration: React 19 teleoperation frontend.
- `server/`: Python Socket.IO rover backend, default port `4000`.
- `base-pi/`: Python Socket.IO base-station backend, default port `4001`.

Key locations:

- Frontend routes: `src/main.jsx`.
- App state provider composition: `src/views/App.jsx`; connection provider setup is also in `src/main.jsx`.
- Shared frontend sockets and host selection: `src/components/socket.io/socket.jsx`.
- CI workflow: `.github/workflows/test.yml`.
- Browser smoke tests: `tests/smoke.spec.ts` and `playwright.config.ts`.

## Frontend workflow

Run these commands from the repository root. Node.js 22 or newer is required; CI uses Node.js 24.

| Task | Command |
| --- | --- |
| Install dependencies | `npm ci` |
| Develop UI without backend auto-connect | `npm run lite` |
| Run normal frontend development mode | `npm run dev` |
| Build frontend | `npm run build` |
| Run browser smoke tests | `npm run playwright` |
| Run lint with warnings | `npm run lint` |
| Run lint with warnings hidden | `npm run lint-quiet` |

- Prefer lite mode for UI work that does not require rover/base connections.
- `lint-quiet` still reports errors and fails when errors are present.
- Playwright starts the frontend in lite mode automatically. On first setup, install Chromium with `npx playwright install chromium`; Linux CI uses `npx playwright install --with-deps chromium`.

## Python backend workflow

CI uses Python 3.11. Each backend uses its own `.venv`; use that environment instead of installing packages globally.

From either `server/` or `base-pi/`:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

From the repository root, use the corresponding environment explicitly:

| Task | Command |
| --- | --- |
| Compile rover backend | `server/.venv/bin/python -m compileall server` |
| Compile base backend | `base-pi/.venv/bin/python -m compileall base-pi` |
| Start rover backend | `server/.venv/bin/python server/py_server.py` |
| Start base backend with offline telemetry | `base-pi/.venv/bin/python base-pi/py_server.py --offline` |

The existing `./install.sh` and `./run.sh` wrappers should be run from their respective backend directory. Offline mode substitutes some telemetry; it does not exercise physical CAN hardware.

Linux/CI can bound smoke runs with `timeout 10s <backend-python> <backend-script>`. Standard macOS installations may not provide `timeout`; use a bounded subprocess runner or stop the smoke process explicitly. For a bounded smoke run, exit code `124` from `timeout` is expected, but verify the startup marker was emitted.

## Validation and reporting

- For frontend code changes, run `npm run build` and relevant lint/browser checks.
- For backend Python changes, run compilation and a bounded startup smoke check for the affected backend where the environment supports it.
- For control, connection, or event-handler changes, verify the affected behavior, including applicable disconnect/reconnect and failure cases. Compilation, builds, and route smoke tests alone do not establish correct control behavior.
- Use focused tests or probes that materially validate the change; avoid unnecessary test scaffolding.
- Preserve the `Server Starting...` startup log in both Python entrypoints; CI checks for it.
- Browser smoke tests expect the listed routes to load, no browser console errors, and the `Teleoperations` header to be visible.
- Distinguish existing lint/test failures from failures introduced by the change.
- Summarize what changed, checks performed, and any material limitations or untested behavior. Distinguish simulated checks from physical hardware testing.
- Documentation-only changes generally need document and reference checks rather than application builds or hardware tests.

## Project caveats and troubleshooting

- Only Vite mode `prod` selects the hardcoded rover/base LAN IPs. Other modes, including `production`, use the current browser hostname.
- Socket auto-connect is disabled in `lite` and `demo` modes.
- Use Chromium-based browsers for controller testing, consistent with the repository's documented browser support.
- If dependencies or imports are missing, check the active environment and install from the relevant lockfile or requirements file.
- Shared repository instructions live in this file. Keep `CLAUDE.md` as an import and `.github/copilot-instructions.md` as a reference to this file to avoid contradictory copies.
