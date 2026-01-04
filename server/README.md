#SERVER INSTALL INSTRUCTIONS

## Dependencies Install(To Run)
Since pip packages work best when virtually installed, you have to keep referencing a virtual enviroment. Scripts are provided below to do exactly this.

TO INSTALL RUN THE SCRIPTS BELOW (MAC/PI), in server/ directory:
  
INSTALL:  ./install.sh  
UPDATE: ./update.sh  
RUN: ./run.sh  
  
OR DIRECT INSTALL(RISKY!):  

pip install -r requirements.txt  
  
## SSH requires three things (For Antenna Metrics)

### Secrets Install
create a file called .env in server/
with the following:
  
SSH_USER=???  
SSH_PASSWORD=???  
  
### SSH Config

Since the Unifi systems use a weaker SSH config that is obsolete, you must override this on the installing computer.
THIS SECURITY OVERRIDE IS SAFE SINCE ITS ONLY FOR THESE TWO COMPUTERS.

ADD THIS IN YOUR ~/.ssh/config FILE ON THE SERVER:
  
Host 192.168.1.20  
    HostKeyAlgorithms +ssh-rsa  
    PubkeyAcceptedAlgorithms +ssh-rsa  
Host 192.168.1.25  
    HostKeyAlgorithms +ssh-rsa  
    PubkeyAcceptedAlgorithms +ssh-rsa  
  
### SSH Fingerprints
Connect to both of these and type "yes" so the client accepts these fingerprints. 
You don't have to type the password, just Control-C out of it.
  
ssh robo@192.168.1.20  
ssh robo@192.168.1.25  
  