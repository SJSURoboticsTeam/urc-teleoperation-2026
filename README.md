# URC Teleoperation

## [----> Online Demo! <----](https://sjsuroboticsteam.github.io/urc-teleoperation-2026/)

## This tool acts as the user interface for operating SJSU Robotic's University Rover Challenge Mars rover remotely.

This monorepo holds the frontend, and two backends for our 2026 rewrite of our software stack.  
### Frontend
The UI operators see and depend on for competition.  
Instructions are in `src/README.md`  
### Rover   
Interfaces with firmware to drive, arm, and science. On the rover.  
Instructions are in `server/README.md`  
### Base PI  
At the base with the operators. Offers antenna metrics streamed to frontend, with more uses coming soon.  
Instructions are in `base-pi/README.md`  
  

## Project Setup

### Prerequisites

Make sure you have the following installed on your machine:

- [Node.js and npm](https://nodejs.org/) (v24 LTS)
- Python3 and pip

#### Macos:
No need for separate python.
- Homebrew is the easiest install path through the terminal.
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" // Homebrew installer
brew install node@24
brew install python
```
- Or installer: 
https://nodejs.org/en/download#:~:text=Or,architecture   
    Pick the architecture(x86 or ARM), then go with the PKG.
https://www.python.org/downloads/
    Then install python

#### Windows:
A bit more complicated.
- NodeJS, NPM installer to run: https://nodejs.org/en/download#:~:text=Or,architecture
    Pick the architecture(x86 or ARM), then go with the MSI.
- Python: Open powershell, run command "python3", proceed to Microsoft store, 
    After install follow instructions in popup to continue install
- Get a Scripts disabled error from npm in Powershell?
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
Note this is lowering security by allowing unsigned scripts to run.


### 1. Navigate to your desired folder and Clone the Repository

```bash
git clone https://github.com/SJSURoboticsTeam/urc-teleoperation-2026.git
cd urc-teleoperation-2026
```

## Contributing  
  
See `CONTRIBUTING.md`  
  