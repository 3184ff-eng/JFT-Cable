const path=require('node:path');const crypto=require('node:crypto');const {decrypt}=require('./crypto.cjs');
const root=__dirname;const sessions=new Map();
async function request(url,options={}){
 const {body=null,headers={},limit=1000000,binary=false}=options;
 const response=await fetch(url,{method:body===null?'GET':'POST',headers:{'User-Agent':'JFT-HTTP-Resolver/0.1','Content-Type':'application/json',...headers},body:body===null?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
 const reader=response.body.getReader();let chunks=[],bytes=0;
 while(bytes<limit){const {done,value}=await reader.read();if(done)break;const take=value.subarray(0,limit-bytes);chunks.push(Buffer.from(take));bytes+=take.length}
 await reader.cancel().catch(()=>{});
 return {status:response.status,url:response.url,type:response.headers.get('content-type')||'',body:binary?'':Buffer.concat(chunks).toString(),bytes};
}
function json(response){if(response.status!==200)throw Error('HTTP '+response.status);return JSON.parse(response.body)}
const headers=(base,code)=>({'Origin':base,'Referer':base+'/e/'+code,'X-Embed-Origin':'1hd.one','X-Embed-Referer':'https://1hd.one/'});
async function identity(base,code){
 if(sessions.has(base))return sessions.get(base);
 const p=(async()=>{
  const h=headers(base,code);
  const c=json(await request(base+'/api/videos/access/challenge',{body:{},headers:h}));
  const {publicKey,privateKey}=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
  const body={viewer_id:'',device_id:'',challenge_id:c.challenge_id,nonce:c.nonce,signature:crypto.sign('sha256',Buffer.from(c.nonce),{key:privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url'),public_key:publicKey.export({format:'jwk'}),client:{user_agent:'JFT-HTTP-Resolver/0.1',languages:['en'],timezone:'America/Port_of_Spain'},storage:{},attributes:{entropy:'low'}};
  const a=json(await request(base+'/api/videos/access/attest',{body,headers:h}));
  return {token:a.token,viewer_id:a.viewer_id,device_id:a.device_id,confidence:a.confidence};
 })();sessions.set(base,p);try{return await p}catch(e){sessions.delete(base);throw e}
}
async function resolve(item){
 const page=item.id==='spiderman'?'https://1hd.one/movie/spider-man-brand-new-day-34095/':item.id;
 const pg=await request(page,{headers:{'User-Agent':'Mozilla/5.0'}});
 if(pg.status!==200)throw Error('Catalog HTTP '+pg.status);
 const endpoint=pg.body.match(/const pl_url = '([^']+)'/);
 if(!endpoint)throw Error('No player endpoint');
 const list=await request(endpoint[1],{headers:{'User-Agent':'Mozilla/5.0','Referer':page}});
 const embeds=[...list.body.matchAll(/data-id="([^"]+)"/g)].map(m=>m[1]);
 if(!embeds.length)throw Error('No embeds');
 // Inspect the source selected by the site's default player, not a guessed video identifier.
 const embed=await request(embeds[0],{headers:{'User-Agent':'Mozilla/5.0','Referer':page}});
 const id=new URL(embed.url).pathname.match(/^\/e\/([a-z0-9]+)\/?$/i);
 if(!id)throw Error('Unsupported default player route');
 const code=id[1],base=new URL(embed.url).origin,h=headers(base,code);
 const fingerprint=await identity(base,code),body={fingerprint};
 const c=json(await request(base+`/api/videos/${code}/embed/captcha`,{body,headers:h}));
 if(!c.pow_nonce||!Number.isInteger(c.pow_difficulty)||c.pow_difficulty>22)throw Error('Interactive or unsupported verification');
 const solution=await new Promise((resolve,reject)=>{
  const worker=new (require('node:worker_threads').Worker)(path.join(root,'proof-worker.cjs'),{workerData:c});
  worker.once('message',resolve);worker.once('error',reject);
  worker.once('exit',exit=>{if(exit!==0)reject(Error('Proof worker exited'))});
 });
 if(solution===null)throw Error('Proof timeout');
 const v=json(await request(base+`/api/videos/${code}/embed/captcha/verify`,{body:{pow_token:c.pow_token,solution,fingerprint},headers:h}));
 if(v.status!=='ok')throw Error('Proof rejected');
 const r=json(await request(base+`/api/videos/${code}/embed/playback`,{body,headers:{...h,'X-Captcha-Token':v.token}}));
 const playback=decrypt(r.playback);
 const sources=(playback.sources||[]).filter(s=>s.url&&s.mime_type==='application/vnd.apple.mpegurl').sort((a,b)=>(b.height||0)-(a.height||0));
 if(!sources.length)throw Error('No HLS source');
 const url=sources[0].url;
 const master=await request(url,{limit:65000});
 if(master.status!==200||!master.body.startsWith('#EXTM3U'))throw Error('Invalid master playlist HTTP '+master.status);
 let variant=master;
 if(master.body.includes('#EXT-X-STREAM-INF')){
  const next=master.body.split(/\r?\n/).find(l=>l.trim()&&!l.startsWith('#'));
  if(!next)throw Error('No variant');
  variant=await request(new URL(next.trim(),url).href,{limit:65000});
 }
 if(variant.status!==200||!variant.body.startsWith('#EXTM3U'))throw Error('Invalid variant');
 const first=variant.body.split(/\r?\n/).find(l=>l.trim()&&!l.startsWith('#'));
 if(!first)throw Error('No segments');
 const segment=await request(new URL(first.trim(),variant.url).href,{headers:{Range:'bytes=0-1023'},limit:1024,binary:true});
 if(![200,206].includes(segment.status)||segment.bytes<188)throw Error('Segment unavailable HTTP '+segment.status);
 return {id:item.id,title:item.title,status:'validated',code,url,quality:sources[0].label,expiresAt:playback.expires_at,checkedAt:new Date().toISOString(),masterStatus:master.status,segmentStatus:segment.status};
}
module.exports={resolve};
