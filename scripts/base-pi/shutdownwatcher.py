import socket
import os
import ipaddress

PORT = 5005
SHUTDOWN_TOKEN = b"ROBO_SHUTDOWN_BASE"
ALLOWED_SUBNET = ipaddress.ip_network("192.168.1.0/24")

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.bind(("", PORT))

print("Watching for shutdown command")
while True:
    data, addr = sock.recvfrom(1024)

    client_ip = ipaddress.ip_address(addr[0])

    if client_ip not in ALLOWED_SUBNET:

        print(f"Ignoring packet from {client_ip}")

        continue

    if data == SHUTDOWN_TOKEN:
        # Linux
        os.system("sleep 3; sudo shutdown -h now")

