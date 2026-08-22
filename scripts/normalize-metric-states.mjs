import fs from 'node:fs';

const FILE='data.json';
const d=JSON.parse(fs.readFileSync(FILE,'utf8'));
const core=['pe','pb','roe','epsGrowth','divYield','eps','bvps','dps'];
const analyst=['pe','forwardPe','ps','pb','pfcf','peg','evSales','evEbitda','evFcf','earningsYield','fcfYield','dividendYield','roe','roa','roic','currentRatio','quickRatio','debtEquity','interestCoverage','assetTurnover','grossMargin','operatingMargin','netMargin','eps','bvps','dps','epsGrowth'];
const hasValue=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v));

for(const x of d.stocks||[]){
  x.metricStatus??={};
  for(const k of core){
    const st=x.metricStatus[k]||{};
    const raw=String(st.state||'').toLowerCase();
    const val=x[k];
    let state;
    if(raw==='error') state='ERROR';
    else if(hasValue(val)) state='VALUE';
    else state='N/A';
    x.metricStatus[k]={...st,state};
  }

  const m=x.saAnalystMetrics||{};
  x.saAnalystMetricStatus={};
  const coreError=Object.values(x.metricStatus).some(s=>s&&s.state==='ERROR');
  for(const k of analyst){
    const v=m[k];
    if(hasValue(v)){
      x.saAnalystMetricStatus[k]={state:'VALUE',source:'SA',detail:'Published by StockAnalysis',checkedAt:m.updatedAt||d.refreshedAt||new Date().toISOString()};
    }else if(coreError && ['pe','pb','roe','epsGrowth','dividendYield','eps','bvps','dps'].includes(k)){
      x.saAnalystMetricStatus[k]={state:'ERROR',source:'SA',detail:'StockAnalysis collection was incomplete for this security; missing value is not treated as N/A',checkedAt:m.updatedAt||d.refreshedAt||new Date().toISOString()};
    }else{
      x.saAnalystMetricStatus[k]={state:'N/A',source:'SA',detail:'Relevant StockAnalysis pages were checked; metric was not published',checkedAt:m.updatedAt||d.refreshedAt||new Date().toISOString()};
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
d.metricStatesNormalizedAt=new Date().toISOString();
fs.writeFileSync(FILE,JSON.stringify(d,null,2)+'\n');

let errors=0,na=0,value=0;
for(const x of d.stocks||[]){
  for(const s of Object.values(x.saAnalystMetricStatus||{})){
    if(s.state==='ERROR')errors++; else if(s.state==='N/A')na++; else if(s.state==='VALUE')value++;
  }
}
console.log(`Normalized metric states: VALUE=${value} N/A=${na} ERROR=${errors}`);
