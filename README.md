# URC Teleoperation 🤖

### This tool acts as the user interface for operating SJSU Robotic's University Rover Challenge Mars rover remotely.

---
## Project Setup

### Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (LTS version recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js) or [yarn](https://yarnpkg.com/)

---

## Getting Started

### 1. Navigate to your desired folder and Clone the Repository
```bash
git clone <repository-url>
cd urc-teleoperation-2026
```
### 2. Install dependencies
```bash
npm install
```
**Navigate to the ```server directory and install dependencies**
```bash
cd /server
npm install
```
### 3. Running the Development Environment
**Start the Client**
In the ```urc-teleoperation-2026``` directory
```bash
npm run dev
```
This will start the React Vite development server. Open [http://localhost:5173](http://localhost:5173) in your browser to view the client.

**Start the Server**
In the ```server``` directory
```bash
npm start
```
This will start the Node.js server. By default, it will run on [http://localhost:4000](http://localhost:4000).


## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
