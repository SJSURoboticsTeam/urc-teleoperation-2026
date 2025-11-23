
numClients = 0

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