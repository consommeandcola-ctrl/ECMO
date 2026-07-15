// @ts-check
const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 60000,
  use: {
    channel: "chrome",
    viewport: { width: 1180, height: 820 },
    locale: "ja-JP",
    timezoneId: "Asia/Tokyo",
  },
});
