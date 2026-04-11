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
  
## Fake Data  
To fake data you can run the following:
Mac/Linux: `./run.sh --offline`  
Windows: `python py_server.py --offline`  
  
## CAN Things to Keep track of

if receiving buffer overload when testing CAN, this means that there is no one ACKing the messages that you are sending, filling up the buffer on the CAN bus.

- to fix this, have a receiving CAN opener that can hear the messages on the bus

resistor in "1" position on rover

resistor in "on" position off rover

`ls /dev/tty.*` to check serial port

can bit rate of 1Mbit

make sure CAN ids are correct
