import fs from 'node:fs';

const FILE='data.json';
const d=JSON.parse(fs.readFileSync(FILE,'utf8'));
const core=['pe','pb','roe','epsGrowth','divYield','eps','bvps','dps'];
const analyst=['pe','forwardPe','ps','pb','pfcf','peg','evSales','evEbitda','evFcf','earningsYield','fcfYield','dividendYield','roe','roa','roic','currentRatio','quickRatio','debtEquity','interestCoverage','assetTurnover','grossMargin','operatingMargin','netMargin','eps','bvps','dps','epsGrowth'];
const hasValue=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));
// N/A requires evidence that every relevant SA page was fetched and inspected.
// Missing page-check evidence is ERROR (not an assumed source omission).
const requiredPages=k=>{
  if(['dividendYield','divYield','dps'].includes(k))return ['statistics','dividend','overview'];
  if(k==='epsGrowth')return ['overview','statistics'];
  if(k==='eps')return ['overview','statistics','financials'];
  if(k==='bvps')return ['statistics','financials','ratios'];
  if(['pe','pb','roe'].includes(k))return ['statistics','ratios','overview'];
  if(['grossMargin','operatingMargin','netMargin'].includes(k))return ['statistics','ratios','financials'];
  return ['statistics','ratios'];
};
const complete=(stock,k)=>requiredPages(k).every(p=>stock.saPagesChecked?.[p]==='VALUE');

for(const x of d.stocks||[]){
  x.metricStatus??={};
  for(const k of core){
    const st=x.metricStatus[k]||{};
    const raw=String(st.state||'').toLowerCase();
    const val=x[k];
    let state;
    if(raw==='error') state='ERROR';
    else if(hasValue(val)) state='VALUE';
    else state=complete(x,k)?'N/A':'ERROR';
    x.metricStatus[k]={...st,state,detail:state==='ERROR'&&!hasValue(val)?'Relevant StockAnalysis page checks incomplete: '+requiredPages(k).filter(p=>x.saPagesChecked?.[p]!=='VALUE').join(', '):(st.detail||null)};
  }

  const m=x.saAnalystMetrics||{};
  x.saAnalystMetricStatus={};
  const coreError=Object.values(x.metricStatus).some(s=>s&&s.state==='ERROR');
  for(const k of analyst){
    const v=m[k];
    if(hasValue(v)){
      x.saAnalystMetricStatus[k]={state:'VALUE',source:'SA',detail:'Published by StockAnalysis',checkedAt:m.updatedAt||d.refreshedAt||new Date().toISOString()};
    }else if(!complete(x,k)){
      x.saAnalystMetricStatus[k]={state:'ERROR',source:'SA',detail:'Relevant StockAnalysis pages failed or were not verified: '+requiredPages(k).filter(p=>x.saPagesChecked?.[p]!=='VALUE').join(', '),checkedAt:m.updatedAt||d.refreshedAt||new Date().toISOString()};
    }else{
      x.saAnalystMetricStatus[k]={state:'N/A',source:'SA',detail:'Relevant StockAnalysis pages successfully checked; metric was not published',checkedAt:m.updatedAt||d.refreshedAt||new Date().toISOString()};
    }
  }

  // Explicitly preserve the source of displayed fallback metrics.
  for(const k of core){
    const source=String(x[`${k}Source`]||'').toUpperCase();
    if(x.metricStatus[k]?.state==='VALUE'){
      x.metricStatus[k].source=source.startsWith('SA')?'SA':source==='CALC'?'CALC':source||null;
    }
  }
}

d.metricStateModel='VALUE/ERROR/N/A';
d.saPageCollectionErrors=(d.stocks||[]).filter(x=>(x.saPageErrors||[]).length).map(x=>({ticker:x.ticker,pages:x.saPageErrors}));
d.metricStatesNormalizedAt=new Date().toISOString();
fs.writeFileSync(FILE,JSON.stringify(d,null,2)+'\n');

let errors=0,na=0,value=0;
for(const x of d.stocks||[]){
  for(const s of Object.values(x.saAnalystMetricStatus||{})){
    if(s.state==='ERROR')errors++; else if(s.state==='N/A')na++; else if(s.state==='VALUE')value++;
  }
}
console.log(`Normalized metric states: VALUE=${value} N/A=${na} ERROR=${errors}`);
