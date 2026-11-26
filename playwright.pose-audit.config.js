import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/pose-privacy',testMatch:/pose-audit\.spec\.js/,timeout:180000,workers:1,
 use:{baseURL:'http://127.0.0.1:4190',browserName:'chromium',headless:true,trace:'off',screenshot:'off',video:'off'},
 webServer:{command:'npx vite preview --config tests/pose-privacy/vite.config.js --host 127.0.0.1 --port 4190 --strictPort',url:'http://127.0.0.1:4190/tests/pose-privacy/harness.html',reuseExistingServer:false,timeout:30000},
});
