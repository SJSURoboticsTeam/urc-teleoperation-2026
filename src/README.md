
## Getting Started

### 1. Install dependencies
In the ```urc-teleoperation-2026``` directory

```bash
cd src/
npm install
```

### 2. Running the Development Environment
**Start the Client**
In the ```urc-teleoperation-2026``` directory

```bash
npm run *
```

|     launch command  | Result  |
| ------------- | ------------- |
| npm run dev | Standard dev testing |
| npm run dev-host | Standard w/lan reachability |
| npm run lan | Connects to actual server, lan reachable |

This will start the React Vite development server. Open [http://localhost:5173](http://localhost:5173) in your browser to view the client.


## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
