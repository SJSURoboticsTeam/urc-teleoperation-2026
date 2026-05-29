#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from rclpy.executors import SingleThreadedExecutor
from std_msgs.msg import String
import json
import threading


class BlackboardClient:
    """
    Standalone wrapper to read/write blackboard data from outside the ROS package.

    Usage:
        client = BlackboardClient()
        client.start()

        value = client.get("base/isBooted")
        client.set("base/isBooted", True)
        all_data = client.get_all()

        client.stop()
    """

    def __init__(self, read_topic="blackboard_state", write_topic="blackboard_command"):
        rclpy.init()
        self._node = Node("blackboard_client")
        self._data = {}
        self._lock = threading.Lock()

        self._node.create_subscription(
            String,
            read_topic,
            self._on_receive,
            10
        )
        self._publisher = self._node.create_publisher(
            String,
            write_topic,
            10
        )

        self._executor = SingleThreadedExecutor()
        self._executor.add_node(self._node)

        self._thread = threading.Thread(target=self._spin, daemon=True)

    def _spin(self):
        try:
            self._executor.spin()
        except Exception:
            pass

    def _on_receive(self, msg):
        with self._lock:
            self._data = json.loads(msg.data)

    def start(self):
        """Launch the background ROS thread."""
        self._thread.start()

    def stop(self):
        """Shutdown cleanly in the correct order."""
        try:
            self._executor.shutdown()  # 1. signal spin() to exit
        except Exception:
            pass

        self._thread.join()            # 2. wait until thread is fully dead

        try:
            self._node.destroy_node()  # 3. safe — nothing using node
        except Exception:
            pass

        try:
            if rclpy.ok():
                rclpy.shutdown()       # 4. safe — nothing using rclpy
        except Exception:
            pass

    def get(self, key, default=None):
        """
        Read a single value from the blackboard.
        Returns default if key not yet received.

        Example:
            client.get("base/isBooted")           # -> False
            client.get("base/missing", "N/A")     # -> "N/A"
        """
        with self._lock:
            return self._data.get(key, default)

    def get_all(self):
        """
        Returns a copy of the entire blackboard state.

        Example:
            client.get_all()
            # -> {"base/isBooted": False, "base/isSafe": True, ...}
        """
        with self._lock:
            return dict(self._data)

    def set(self, key, value):
        """
        Write a key/value pair to the blackboard via ROS topic.

        Example:
            client.set("base/isBooted", True)
            client.set("base/isSafe", False)
        """
        msg = String()
        msg.data = json.dumps({"key": key, "value": value})
        self._publisher.publish(msg)