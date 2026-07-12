import socket
import os

PORT = 5005
SHUTDOWN_TOKEN = b"ROBO_SHUTDOWN_CAMS"

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(("", PORT))

print("Watching for shutdown command")
while True:
    data, addr = sock.recvfrom(1024)

    if data == SHUTDOWN_TOKEN:
        # Linux
        os.system("sudo shutdown -h now")

