import {defineConfig} from 'vite';
import base from '../../vite.config.js';
import {resolve} from 'node:path';
export default defineConfig({
  ...base,
  build:{
    outDir:'.hand-runtime-dist',
    emptyOutDir:true,
    rollupOptions:{input:resolve(process.cwd(),'tests/hand-runtime/harness.html')},
  },
});
