import {defineConfig} from 'vite';
import base from '../../vite.config.js';
import {resolve} from 'node:path';
export default defineConfig({
 ...base,
 preview:{...base.preview,headers:{...base.preview.headers,'Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self'; img-src 'self' blob: data:; style-src 'self'"}},
 build:{outDir:'.pose-audit-dist',emptyOutDir:true,rollupOptions:{input:resolve(process.cwd(),'tests/pose-privacy/harness.html')}},
});
