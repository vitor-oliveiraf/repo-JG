import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests-production",
  timeout: 45000,
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/production", open: "never" }],
  ],
  use: {
    baseURL: process.env.DEPLOY_URL || "http://localhost:4173",
    channel: "chrome",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "wide", use: { viewport: { width: 2554, height: 912 } } },
    { name: "short", use: { viewport: { width: 1024, height: 600 } } },
  ],
  webServer: process.env.DEPLOY_URL
    ? undefined
    : {
        command: "npm run preview -- --port 4173",
        url: "http://localhost:4173",
        reuseExistingServer: true,
      },
});
