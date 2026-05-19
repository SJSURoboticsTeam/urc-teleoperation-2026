# SERVER INSTALL INSTRUCTIONS

## Dependencies Install(To Run)

Since pip packages work best when virtually installed, you have to keep referencing a virtual enviroment. Scripts are provided below to do exactly this.

TO INSTALL RUN THE SCRIPTS BELOW (MAC/PI), in server/ directory:

INSTALL: `./install.sh`  
UPDATE: `./update.sh`  
RUN: `./run.sh`

OR DIRECT INSTALL(RISKY!):

```bash
pip install -r requirements.txt
```

## Fake Input

To fake data you can run the following:  
Mac/Linux: `./run.sh --offline`  
Windows: `python py_server.py --offline`

## SSH requires three things (For Antenna Metrics)

### Secrets Install

create a file called .env in base-pi/
with the following:

```bash
SSH_USER=???
SSH_PASSWORD=???
```

### SSH Config

We need to make a few changes to how SSH works to connect.
Doing this by IP allows full functionality on weak encryption without endangering your computer to anything else.

ADD THIS IN YOUR `~/.ssh/config` FILE ON THE BASE-PI SERVER:

```bash
Host 192.168.1.20
    HostKeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
Host 192.168.1.25
    HostKeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
Host 192.168.5.20
    HostKeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
Host 192.168.5.25
    HostKeyAlgorithms +ssh-rsa
    PubkeyAcceptedAlgorithms +ssh-rsa
```
