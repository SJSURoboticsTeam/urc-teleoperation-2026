#!/usr/bin/env python3
import rclpy
from rclpy.node import Node
from std_msgs.msg import String
import json
import threading


class BlackboardClient:
    """
    Standalone wrapper to read/write blackboard data from outside the ROS package.
    
    Usage:
        client = BlackboardClient()
        client.start()

        # Read a value
        value = client.get("base/isBooted")

        # Write a value
        client.set("base/isBooted", True)

        client.stop()
    """

    def __init__(self, read_topic="blackboard_state", write_topic="blackboard_command"):
        rclpy.init()
        self._node = Node("blackboard_client")
        self._data = {}
        self._lock = threading.Lock()

        # Subscriber — receives blackboard state from the ROS package
        self._subscriber = self._node.create_subscription(
            String,
            read_topic,
            self._on_receive,
            10
        )

        # Publisher — sends key/value commands back to the ROS package
        self._publisher = self._node.create_publisher(
            String,
            write_topic,
            10
        )

        # Spin in background thread so it doesn't block your script
        self._thread = threading.Thread(target=self._spin, daemon=True)

    def _spin(self):
        rclpy.spin(self._node)

    def _on_receive(self, msg):
        with self._lock:
            self._data = json.loads(msg.data)

    def start(self):
        """Start the background ROS thread."""
        self._thread.start()

    def stop(self):
        """Shutdown cleanly."""
        try:
            self._node.destroy_node()
        except Exception:
            pass
        try:
            if rclpy.ok():
                    rclpy.shutdown()
        except Exception:
            pass

    def get(self, key, default=None):
        """
        Read a value from the blackboard by key.
        Returns default if key not yet received.

        Example:
            client.get("base/isBooted")        # -> False
            client.get("base/isArm")           # -> True
            client.get("base/missing", "N/A")  # -> "N/A"
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
