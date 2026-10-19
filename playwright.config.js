import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir:"./tests/e2e",
  outputDir:"test-results",
  projects:[
    {
      name:"desktop-chromium",
      testMatch:/smoke\.spec\.js/,
      use:{...devices["Desktop Chrome"],viewport:{width:1440,height:1000}}
    },
    {
      name:"mobile-chromium",
      testMatch:/smoke\.spec\.js/,
      use:{...devices["Pixel 7"]}
    },
    {
      name:"camera-chromium",
      testMatch:/camera\.spec\.js/,
      use:{
        ...devices["Desktop Chrome"],
        permissions:["camera"],
        launchOptions:{
          args:[
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream"
          ]
        }
      }
    }
  ],
  use:{
    baseURL:"http://127.0.0.1:4173",
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    video:"on",
  },
  webServer:{
    command:"npm run preview -- --host 127.0.0.1",
    url:"http://127.0.0.1:4173",
    reuseExistingServer:true
  }
});
