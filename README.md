# URC Teleoperation 🤖

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

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js) or [yarn](https://yarnpkg.com/)
- Python3 and pip


### 1. Navigate to your desired folder and Clone the Repository

```bash
git clone https://github.com/SJSURoboticsTeam/urc-teleoperation-2026.git
cd urc-teleoperation-2026
```

## Known Issues
- Firefox does not support the controller API. Use Chrome, Edge, other other Chrome/Chromium Fork.