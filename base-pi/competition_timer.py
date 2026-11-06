import math
import time


TIMER_PRESETS = (5, 10, 15, 20, 30, 45, 60)


class CompetitionTimer:
    """Stores and updates the shared competition countdown state."""

    def __init__(self, default_minutes=5):
        if default_minutes not in TIMER_PRESETS:
            raise ValueError("Invalid default timer preset")

        self.preset_minutes = default_minutes
        self.duration_seconds = default_minutes * 60
        self.remaining_seconds = self.duration_seconds
        self.status = "idle"
        self.started_at = None
        self.ends_at = None

    @staticmethod
    def _now_ms():
        """Return the current Unix time in milliseconds."""
        return int(time.time() * 1000)

    def _update_finished_state(self):
        """Update the timer when a running countdown reaches zero."""
        if self.status != "running" or self.ends_at is None:
            return

        remaining_ms = self.ends_at - self._now_ms()
        self.remaining_seconds = max(0, math.ceil(remaining_ms / 1000))

        if self.remaining_seconds == 0:
            self.status = "finished"

    def get_state(self):
        """Return the current timer state for Socket.IO clients."""
        self._update_finished_state()

        return {
            "status": self.status,
            "presetMinutes": self.preset_minutes,
            "durationSeconds": self.duration_seconds,
            "remainingSeconds": self.remaining_seconds,
            "startedAt": self.started_at,
            "endsAt": self.ends_at,
        }

    def set_preset(self, minutes):
        """Select a preset and reset the timer to that duration."""
        if minutes not in TIMER_PRESETS:
            raise ValueError("Invalid timer preset")

        self.preset_minutes = minutes
        self.duration_seconds = minutes * 60
        self.remaining_seconds = self.duration_seconds
        self.status = "idle"
        self.started_at = None
        self.ends_at = None

        return self.get_state()

    def start(self):
        """Start or resume the countdown."""
        self._update_finished_state()

        if self.status == "finished":
            raise ValueError("Reset the timer before starting it again")

        if self.status == "running":
            return self.get_state()

        now = self._now_ms()
        self.started_at = now
        self.ends_at = now + (self.remaining_seconds * 1000)
        self.status = "running"

        return self.get_state()

    def pause(self):
        """Pause the countdown and preserve the remaining time."""
        self._update_finished_state()

        if self.status != "running":
            return self.get_state()

        self.status = "paused"
        self.ends_at = None

        return self.get_state()

    def reset(self):
        """Reset the timer to the currently selected preset."""
        self.remaining_seconds = self.duration_seconds
        self.status = "idle"
        self.started_at = None
        self.ends_at = None

        return self.get_state()