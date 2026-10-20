import fs from "node:fs";

const expected={
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "Permissions-Policy": "camera=(self), microphone=(), geolocation=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin"
};
const fail=(message)=>{console.error("[deploy-check] FAIL:",message);process.exit(1);};
const ok=(message)=>console.log("[deploy-check] OK:",message);

const vercel=JSON.parse(fs.readFileSync("vercel.json","utf8"));
if(vercel.framework!=="vite")fail("vercel.json framework must be vite");
if(vercel.buildCommand!=="npm run build")fail("vercel.json buildCommand drift");
if(vercel.outputDirectory!=="dist")fail("vercel.json outputDirectory must be dist");

const route=vercel.headers?.find((entry)=>entry.source==="/(.*)");
if(!route)fail("vercel.json missing catch-all headers rule");
const vercelHeaders=Object.fromEntries((route.headers||[]).map(({key,value})=>[key,value]));
for(const [key,value] of Object.entries(expected)){
  if(vercelHeaders[key]!==value)fail(`Vercel header mismatch: ${key}`);
}
ok("Vercel Vite build + security headers");

const netlify=fs.readFileSync("netlify.toml","utf8");
for(const [key,value] of Object.entries(expected)){
  const needle=`${key} = "${value.replaceAll('"','\\\"')}"`;
  if(!netlify.includes(needle))fail(`Netlify header drift: ${key}`);
}
ok("Netlify legacy config matches canonical production headers");

const portable=fs.readFileSync("PORTABLE_SERVER.py","utf8");
for(const key of Object.keys(expected)){
  if(!portable.includes(`"${key}"`))fail(`Portable server missing header: ${key}`);
}
for(const value of ["camera=(self), microphone=(), geolocation=()","same-origin","require-corp","nosniff","DENY","no-referrer"]){
  if(!portable.includes(value))fail(`Portable server missing security value: ${value}`);
}
ok("Portable demo server contains production isolation/privacy headers");

console.log("[deploy-check] READY: deployment configurations are aligned.");
