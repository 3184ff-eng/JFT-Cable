const {parentPort,workerData}=require('node:worker_threads');const {digest,zeroBits}=require('./crypto.cjs');
const c=workerData;const start=Date.now();let solution=null;
for(let i=0;Date.now()-start<45000;i++)if(zeroBits(digest(c.pow_nonce+':'+i))>=c.pow_difficulty){solution=String(i);break}
parentPort.postMessage(solution);
