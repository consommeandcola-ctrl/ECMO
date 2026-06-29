// @ts-check
const { defineConfig } = require("@playwright/test");
const path = require("path");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    channel: "chrome",
    baseURL: "http://127.0.0.1:8765",
    viewport: { width: 1280, height: 900 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
  webServer: {
    command: "node tests/serve.js",
    url: "http://127.0.0.1:8765",
    reuseExistingServer: true,
  },
});
