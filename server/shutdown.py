import socket
PORT = 5005

def register_shutdown_commands(sio):
    # For all of our shutdowns we send a magic packet each device is preconfigured to listen to.
    # Base Pi gets preference, but server is a fallback.

    @sio.event
    async def shutdown_cameras(sid):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                KEY= b"ROBO_SHUTDOWN_CAMS" #encoded message, keep unique
                # broadcast to the subnet, everything in 192.168.1.* gets it
                sock.sendto(KEY, ("192.168.1.255", PORT)) 
                print("Shutdown sent to cameras.")
                return 1
        except Exception as exc:
            print(f"Error running shutdown to cameras: {exc}")
            return -1
    @sio.event
    async def shutdown_basepi(sid):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                KEY= b"ROBO_SHUTDOWN_BASE" #encoded message, keep unique
                # broadcast to the subnet, everything in 192.168.1.* gets it
                sock.sendto(KEY, ("192.168.1.255", PORT)) 
                print("Shutdown sent to base pi.")
                return 1
        except Exception as exc:
            print(f"Error running shutdown to base pi: {exc}")
            return -1
    @sio.event
    async def shutdown_server(sid):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
                KEY= b"ROBO_SHUTDOWN_SERVER" #encoded message, keep unique
                # broadcast to the subnet, everything in 192.168.1.* gets it
                sock.sendto(KEY, ("192.168.1.255", PORT)) 
                print("Shutdown sent to server.")
                return 1
        except Exception as exc:
            print(f"Error running shutdown to server: {exc}")
            return -1
        
