import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/hand-runtime',
  testMatch:/runtime\.spec\.js/,
  timeout:180000,
  workers:1,
  use:{baseURL:'http://127.0.0.1:4189',browserName:'chromium',headless:true,
    trace:'off',screenshot:'off',video:'off'},
  webServer:{
    command:'npx vite preview --config tests/hand-runtime/vite.config.js --host 127.0.0.1 --port 4189 --strictPort',
    url:'http://127.0.0.1:4189/tests/hand-runtime/harness.html',
    reuseExistingServer:false,timeout:30000,
  },
});
