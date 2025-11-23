
import paramiko
from dotenv import load_dotenv
import os
numClients = 0

## .env USAGE
## SSH_USER=???
## SSH_PASSWORD=???
##
load_dotenv()  # loads from .env

username = os.getenv("SSH_USER")
password = os.getenv("SSH_PASSWORD")


def get_rssi(hostname, username="ubnt", password=None, key_filename=None, timeout=10):
    """
    Connects to a Ubiquiti device via SSH and retrieves the signal strength value.
    
    Args:
        hostname (str): IP or hostname of the device
        username (str): SSH username (default: 'ubnt')
        password (str, optional): SSH password
        key_filename (str, optional): Path to SSH private key
        timeout (int): SSH connection timeout in seconds
    
    Returns:
        str: Signal strength in dBm, or None if command fails
    """
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        ssh.connect(
            hostname,
            username=username,
            password=password,
            key_filename=key_filename,
            timeout=timeout
        )

        command = "mca-status | grep signal"
        stdin, stdout, stderr = ssh.exec_command(command)
        output = stdout.read().decode().strip()
        error = stderr.read().decode().strip()

        if error:
            print(f"[{hostname}] Error: {error}")
            return None
        
        return output[7:]

    except Exception as e:
        print(f"[{hostname}] Connection failed: {e}")
        return None

    finally:
        ssh.close()

def register_metrics(sio):
    @sio.event
    def init():
        global numClients
        numClients = 0
    @sio.event
    def connect(sid, environ):
        global numClients
        print(f'Client connected: {sid}')
        numClients = numClients + 1

    @sio.event
    def disconnect(sid):
        global numClients
        print(f'Client disconnected: {sid}')
        numClients = numClients - 1

    @sio.event
    def getConnections(sid):
        global numClients
        return numClients
    @sio.event
    def getConnections(sid):
        global numClients
        return numClients
    @sio.event
    def pingCheck(sid):
        return 1
    #@sio.event
    #def roverRSSI(sid):
     #   global username, password
     #   return (get_rssi("192.168.1.20",username,password))
    #@sio.event
    #def baseRSSI(sid):
    #    global username, password
     #   return (get_rssi("192.168.1.25",username,password))
