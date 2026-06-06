import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",

  use: {
    // 5173 for dev, 4173 for prod
    baseURL: "http://localhost:5173",
    headless: true,
  },

  webServer: {
    // use lite to avoid console errors connecting to backend
    // also running a dev build reduces CI/CD time building,
    // when we already know the build works
    command: "npm run lite",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
  },
});