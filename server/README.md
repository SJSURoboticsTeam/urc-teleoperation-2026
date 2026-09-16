# SERVER INSTALL INSTRUCTIONS

## Dependencies Install(To Run)
For MacOS and Linux, pip packages work best with a VENV enviroment where each project has 
its own dependencies. Follow your platform below:

#### Mac/Linux
TO INSTALL RUN THE SCRIPTS BELOW (MAC/PI), in server/ directory:

INSTALL: `./install.sh`  
UPDATE: `./update.sh`  
RUN: `./run.sh`
  
#### Windows/Non-VENV setups  
INSTALL/UPDATE: `pip install -r requirements.txt`  
RUN: `python py_server.py`  
  
The --offline flag dictates whether features use simulation values or actual hardware.  
  
## Fake Input

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