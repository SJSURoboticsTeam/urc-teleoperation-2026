"""Fake science firmware for --offline runs.

MockScienceLink has the same interface as the real CAN link (send_step, send_stop,
is_mock) and reports back through the same ScienceSession.handle_* methods, so the
state machine, timeouts, logging and frontend behave identically with or without
hardware. It mocks the parsed events, not raw CAN bytes, because firmware hasn't
defined the sensor frame layouts yet.
"""

import asyncio
import random

from science import SATURATION_COUNT

MOCK_STEP_SECONDS = 1.5
MOCK_DROP_ACKS = False  # set True by hand to never send FINISHED_STEP and exercise the step timeout
NOISE_FRACTION = 0.03   # gaussian sigma as a fraction of each count

# Calibration readings (415, 455, 480, 515, 555, 590, 630, 680 nm) from the old hardcoded UI data.
# The clear 415 nm channel sits at the 16-bit max, so noise on it shows the saturation path.
MOCK_CLEAR = [65535, 1364, 696, 568, 1466, 4655, 1140, 338]
MOCK_VIALS = {
    "purple": [9875, 136, 78, 68, 166, 494, 117, 37],
    "blue": [17042, 231, 148, 104, 302, 817, 211, 68],
    "red": [15923, 281, 271, 171, 276, 1156, 269, 92],
}


class MockScienceLink:
    is_mock = True

    def __init__(self, session, step_seconds=MOCK_STEP_SECONDS, drop_acks=MOCK_DROP_ACKS, rng=None):
        self.session = session
        self.step_seconds = step_seconds
        self.drop_acks = drop_acks
        self.rng = rng or random.Random()
        self._tasks = set()  # held so scheduled steps aren't garbage collected mid-flight

    async def send_step(self, site, step):
        task = asyncio.get_running_loop().create_task(self._run_step(site, step))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)
        return True

    async def send_stop(self):
        self.cancel_all()
        return True

    def cancel_all(self):
        for task in list(self._tasks):
            task.cancel()

    def _noisy(self, counts):
        return [
            min(SATURATION_COUNT, max(0, round(c * self.rng.gauss(1, NOISE_FRACTION))))
            for c in counts
        ]

    async def _run_step(self, site, step):
        try:
            await asyncio.sleep(self.step_seconds)
            if self.drop_acks:
                return
            await self.session.handle_environment_reading(
                round(self.rng.gauss(1013, 3), 1),
                round(self.rng.gauss(40, 2), 1),
                round(self.rng.gauss(21, 0.5), 1),
            )
            if step >= len(self.session.steps) - 1:
                # readings go in before the final ack, while the site is still active
                await self.session.handle_color_reading("clear", self._noisy(MOCK_CLEAR))
                for name, counts in MOCK_VIALS.items():
                    await self.session.handle_color_reading(name, self._noisy(counts))
            await self.session.handle_step_finished(step)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            print(f"[SCIENCE MOCK] step {step} failed: {e}")
