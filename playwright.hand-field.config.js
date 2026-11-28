import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests/hand-field',testMatch:/field\.spec\.js/,timeout:100000,workers:1,
 use:{baseURL:'http://127.0.0.1:4191',browserName:'chromium',headless:true,permissions:['camera'],trace:'off',screenshot:'off',video:'off',launchOptions:{args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']}},
 webServer:{command:'npx vite preview --config tests/hand-field/vite.config.js --host 127.0.0.1 --port 4191 --strictPort',url:'http://127.0.0.1:4191',reuseExistingServer:false,timeout:30000},
});
