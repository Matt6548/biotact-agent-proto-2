import {defineConfig} from 'vite';
import base from '../../vite.config.js';
export default defineConfig({
 ...base,
 preview:{...base.preview,headers:{...base.preview.headers,'Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self'; worker-src 'self' blob:; img-src 'self' blob: data:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'"}},
 build:{outDir:'.hand-field-dist',emptyOutDir:true},
});
