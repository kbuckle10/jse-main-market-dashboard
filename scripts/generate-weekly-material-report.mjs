import fs from 'node:fs';
import path from 'node:path';

const cur=JSON.parse(fs.readFileSync('data.json','utf8'));
const today=String(cur.asOf||'');
const dir='history';
const hist=fs.existsSync(dir)?fs.readdirSync(dir).filter(f=>/^\d{4}-\d{2}-\d{2}\.json$/.test(f)&&f.slice(0,10)<today).sort():[];
let previous=null,previousFile=null;
for(const f of hist.reverse()){
  try{const d=JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));if(Array.isArray(d.stocks)&&d.stocks.length>10){previous=d;previousFile=f;break}}catch{}
}
const nums=s=>(String(s||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/g)||[]).map(Number);
const zoneState=x=>{const p=Number(x?.price);const z=nums(x?.buyZone);if(!Number.isFinite(p)||!z.length)return null;const lo=z.length>1?z[0]:0,hi=z[z.length-1];return p>=lo&&p<=hi?'IN':p<lo?'BELOW':'ABOVE'};
const byTicker=a=>new Map((a||[]).map(x=>[x.ticker,x]));
const pm=byTicker(previous?.stocks), cm=byTicker(cur.stocks);
const ratingChanges=[],zoneChanges=[],weeklyMoves=[],valuationChanges=[];
for(const x of cur.stocks||[]){
  const p=pm.get(x.ticker);
  if(p&&p.rating!==x.rating)ratingChanges.push({ticker:x.ticker,from:p.rating,to:x.rating,scoreFrom:p.score,scoreTo:x.score});
  const zs=zoneState(x), ps=zoneState(p);
  if(p&&zs&&ps&&zs!==ps)zoneChanges.push({ticker:x.ticker,from:ps,to:zs,price:x.price,buyZone:x.buyZone});
  if(Number.isFinite(Number(x.w1))&&Math.abs(Number(x.w1))>=5)weeklyMoves.push({ticker:x.ticker,w1:Number(x.w1),price:x.price,rating:x.rating});
  if(p&&(String(p.fairValue||'')!==String(x.fairValue||'')||String(p.buyZone||'')!==String(x.buyZone||'')))valuationChanges.push({ticker:x.ticker,fairValueFrom:p.fairValue??null,fairValueTo:x.fairValue??null,buyZoneFrom:p.buyZone??null,buyZoneTo:x.buyZone??null});
}
const top=a=>[...(a||[])].filter(x=>Number.isFinite(Number(x.score))).sort((a,b)=>Number(b.score)-Number(a.score)).slice(0,10).map(x=>x.ticker);
const topNow=top(cur.stocks),topPrev=top(previous?.stocks);
const enteredTop10=topNow.filter(t=>!topPrev.includes(t)),exitedTop10=topPrev.filter(t=>!topNow.includes(t));
function portfolio(stocks,type){let pool=(stocks||[]).filter(x=>x.rating==='BUY'||x.rating==='HOLD');pool.sort((a,b)=>type==='income'?(Number(b.divYield)||0)-(Number(a.divYield)||0):type==='growth'?(Number(b.epsGrowth)||-999)-(Number(a.epsGrowth)||-999):(Number(b.score)||0)-(Number(a.score)||0));pool=pool.slice(0,7);const raw=pool.map(x=>type==='income'?Math.max(1,Number(x.divYield)||1):type==='growth'?Math.max(1,Math.min(30,(Number(x.epsGrowth)||0)+10)):Math.max(1,Number(x.score)||1));const total=raw.reduce((a,b)=>a+b,0)||1;const arr=pool.map((x,i)=>({ticker:x.ticker,pct:Math.round(raw[i]/total*100)}));if(arr.length)arr[0].pct+=100-arr.reduce((s,o)=>s+o.pct,0);return arr}
const portfolios={};
for(const type of ['income','growth','balanced']){
 const now=portfolio(cur.stocks,type),prev=portfolio(previous?.stocks,type),pmap=new Map(prev.map(x=>[x.ticker,x.pct]));
 const changes=now.map(x=>({ticker:x.ticker,pct:x.pct,previousPct:pmap.get(x.ticker)??0,delta:x.pct-(pmap.get(x.ticker)??0)})).filter(x=>Math.abs(x.delta)>=3||!pmap.has(x.ticker));
 const exits=prev.filter(x=>!now.some(n=>n.ticker===x.ticker)).map(x=>({ticker:x.ticker,previousPct:x.pct}));
 portfolios[type]={now,changes,exits};
}
const errors=[];
for(const x of cur.stocks||[]){for(const [k,v] of Object.entries(x.metricStatus||{})){if(String(v?.state||'').toLowerCase()==='error')errors.push({ticker:x.ticker,metric:k,detail:v.detail||null})}}
const report={generatedAt:new Date().toISOString(),marketDataDate:cur.asOf||null,previousSnapshot:previousFile,universeCount:(cur.stocks||[]).length,ratingChanges,zoneChanges,weeklyMoves:weeklyMoves.sort((a,b)=>Math.abs(b.w1)-Math.abs(a.w1)),valuationChanges,top10:{current:topNow,previous:topPrev,entered:enteredTop10,exited:exitedTop10},portfolios,collectionErrors:errors};
fs.writeFileSync('weekly-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
