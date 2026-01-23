# SERVER INSTALL INSTRUCTIONS

## Dependencies Install(To Run)
Since pip packages work best when virtually installed, you have to keep referencing a virtual enviroment. Scripts are provided below to do exactly this.

TO INSTALL RUN THE SCRIPTS BELOW (MAC/PI), in server/ directory:

  
INSTALL:  ```./install.sh```   
UPDATE:  ```./update.sh```   
RUN:  ```./run.sh```   
  

OR DIRECT INSTALL(RISKY!):  
```bash
pip install -r requirements.txt  
```
  
## SSH requires three things (For Antenna Metrics)

### Secrets Install
create a file called .env in server/
with the following:

```bash
SSH_USER=???   
SSH_PASSWORD=???  
```
  
### SSH Config

Since the Unifi systems use a weaker SSH config that is obsolete, you must override this on the installing computer.
THIS SECURITY OVERRIDE IS SAFE SINCE ITS ONLY FOR THESE TWO COMPUTERS.

ADD THIS IN YOUR ```~/.ssh/config``` FILE ON THE SERVER:

```bash  
Host 192.168.1.20  
    HostKeyAlgorithms +ssh-rsa  
    PubkeyAcceptedAlgorithms +ssh-rsa  
Host 192.168.1.25  
    HostKeyAlgorithms +ssh-rsa  
    PubkeyAcceptedAlgorithms +ssh-rsa  
```
  
### SSH Fingerprints
Connect to both of these and type "yes" so the client accepts these fingerprints. 
You don't have to type the password, just Control-C out of it.

```bash
ssh robo@192.168.1.20  
ssh robo@192.168.1.25  
```
  
## CAN Things to Keep track of
if receiving buffer overload when testing CAN, this means that there is no one ACKing the messages that you are sending, filling up the buffer on the CAN bus.
- to fix this, have a receiving CAN opener that can hear the messages on the bus

resistor in "1" position on rover

resistor in "on" position off rover

```ls /dev/tty.*``` to check serial port

can bit rate of 1Mbit

make sure CAN ids are correct