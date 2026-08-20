import fs from 'node:fs';
const file='index.html';
let html=fs.readFileSync(file,'utf8');
const before=html;
html=html.replace("const priceUrl=ps==='SA'?sa(x):JSE;","const priceUrl=ps==='SA'?sa(x):(x.jseUrl||JSE);");
html=html.replace("src('JSE',`Official JSE closing price${jseDate?' baseline '+jseDate:''}`,JSE)","src('JSE',`Official JSE closing price${jseDate?' baseline '+jseDate:''}`,x.jseUrl||JSE)");
if(html!==before){fs.writeFileSync(file,html);console.log('Dashboard now prefers direct JSE instrument URLs captured from Listed Companies.');}else{console.log('Dashboard direct-link patch already applied or target text changed.');}
