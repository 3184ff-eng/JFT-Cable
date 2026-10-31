const crypto=require('node:crypto');
const rol=(n,k)=>(n<<k|n>>>(32-k))>>>0;
function mix(s){
 s[0]=(s[0]+s[1])>>>0;s[3]=rol(s[3]^s[0],16);
 s[2]=(s[2]+s[3])>>>0;s[1]=rol(s[1]^s[2],12);
 s[0]=(s[0]+s[1])>>>0;s[3]=rol(s[3]^s[0],8);
 s[2]=(s[2]+s[3])>>>0;s[1]=rol(s[1]^s[2],7);
}
function digest(text){
 const s=new Uint32Array([1779033703,3144134277,1013904242,2773480762]);
 for(const b of Buffer.from(text,'latin1')){s[0]=rol((s[0]+b)>>>0,7);mix(s)}
 for(let i=0;i<8;i++)mix(s);
 const mem=new Uint32Array(512);
 for(let i=0;i<512;i++){mix(s);mem[i]=(s[0]^s[2])>>>0}
 for(let pass=0;pass<2;pass++)for(let i=0;i<512;i++){
  let n=rol((mem[i]+mem[mem[i]&511])>>>0,13);
  n=(n^Math.imul(mem[(i+1)&511],2654435761))>>>0;
  mem[i]=n;s[0]=(s[0]^n)>>>0;mix(s);
 }
 const out=new Uint32Array(8);
 for(let i=0;i<8;i++){
  mix(s);let n=s[0];
  for(let k=0;k<64;k++){const v=mem[i*64+k];n=rol((n+v)>>>0,5);n=(n^Math.imul(v,2246822519))>>>0}
  out[i]=(n^s[2])>>>0;
 }return out;
}
function zeroBits(a){let n=0;for(const v of a){if(v===0)n+=32;else return n+Math.clz32(v)}return n}
function decrypt(p){
 const version=Number(p.version),parts=p.key_parts;
 const selected=version>=1&&version<=20&&version<=parts.length&&31-version<=parts.length?[parts[version-1],parts[30-version]]:parts;
 const key=Buffer.concat(selected.map(v=>Buffer.from(v,'base64url')));
 const data=Buffer.from(p.payload,'base64url');
 const cipher=crypto.createDecipheriv(`aes-${key.length*8}-gcm`,key,Buffer.from(p.iv,'base64url'));
 cipher.setAuthTag(data.subarray(-16));
 return JSON.parse(Buffer.concat([cipher.update(data.subarray(0,-16)),cipher.final()]).toString());
}
module.exports={digest,zeroBits,decrypt};
