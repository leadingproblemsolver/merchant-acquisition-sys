// Built-in zero-dependency server for the existing HTML/JS app + optional Gemini.
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {askGemini} from './api/gemini.mjs';
const ROOT=path.dirname(fileURLToPath(import.meta.url));const PORT=Number(process.env.PORT||8080);
const MIME={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.csv':'text/csv; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/plain; charset=utf-8'};
const serve=(res,status,text,contentType='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':contentType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(text)};
export function handler(req,res){
 const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
 if(url.pathname==='/api/health')return serve(res,200,JSON.stringify({ok:true,geminiConfigured:!!process.env.GEMINI_API_KEY}));
 if(url.pathname==='/api/conversation'){
  if(req.method!=='POST')return serve(res,405,JSON.stringify({error:'POST required'}));
  let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>10000)req.destroy()});
  req.on('end',async()=>{
    if(raw.length>10000)return serve(res,413,JSON.stringify({error:'Input too large'}));
    try{const input=JSON.parse(raw);const reply=await askGemini(input);serve(res,200,JSON.stringify(reply))}
    catch(e){const missing=e.code==='NO_KEY';serve(res,missing?503:422,JSON.stringify({error:missing?'Gemini is not configured; use the offline mapper':String(e.message).slice(0,180)}))}
  });return;
 }
 if(req.method!=='GET')return serve(res,405,'Method not allowed','text/plain');
 const allowed=['/','/index.html','/REALX_CONVERSATION_STANDALONE.html','/src/domain.mjs','/src/realx-core.mjs','/src/conversation-core.mjs','/src/conversation-app.mjs','/data/food_candidates.csv'];
 if(!allowed.includes(url.pathname))return serve(res,404,'Not found','text/plain');
 const file=path.join(ROOT,url.pathname==='/'?'index.html':url.pathname.slice(1));
 fs.readFile(file).then(bytes=>serve(res,200,bytes,MIME[path.extname(file)]||'text/plain')).catch(()=>serve(res,404,'Not found','text/plain'));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 http.createServer(handler).listen(PORT,process.env.HOST||'127.0.0.1',()=>console.log(`RealX engine at http://localhost:${PORT}; Gemini ${process.env.GEMINI_API_KEY?'enabled':'disabled (offline mapper works)'}`));
}
