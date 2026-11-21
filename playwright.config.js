import { defineConfig, devices } from "@playwright/test";

const localChromium=process.env.CANDLE_E2E_CHROMIUM_PATH;
const browserLaunch=localChromium?{executablePath:localChromium}:{};

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
      name:"candle-visual-chromium",
      testMatch:/candle-visual\.spec\.js/,
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
          ...browserLaunch,
          args:[
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream"
          ]
        }
      }
    },
    {
      name:"camera-mobile-chromium",
      testMatch:/camera\.spec\.js/,
      use:{
        ...devices["Pixel 7"],
        permissions:["camera"],
        launchOptions:{
          ...browserLaunch,
          args:[
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream"
          ]
        }
      }
    },
    {
      name:"resilience-chromium",
      testMatch:/resilience\.spec\.js/,
      use:{...devices["Desktop Chrome"]}
    }
  ],
  use:{
    baseURL:"http://127.0.0.1:4173",
    launchOptions:browserLaunch,
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
