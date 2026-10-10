import fs from 'node:fs';
const file='cashflow-data.json', input=process.argv[2]||'research/sa-cashflows-batch.json';
const data=JSON.parse(fs.readFileSync(file,'utf8')), incoming=JSON.parse(fs.readFileSync(input,'utf8'));
const currency={TJH:'USD',CPJ:'USD'};
const existing=new Map(data.companies.map(x=>[x.ticker,x]));
let added=0, rejected=[];
for(const x of incoming.results||[]){
 if(x.status!=='parsed'||!Array.isArray(x.periods)||x.periods.length<3){rejected.push(x.ticker+': missing periods');continue;}
 const periods=x.periods.map(p=>({period:p.period,periodEnding:p.periodEnding,operatingCashFlow:p.operatingCashFlow,capitalExpenditures:p.capitalExpenditures,freeCashFlow:p.freeCashFlow}));
 if(periods.some(p=>!p.periodEnding||![p.operatingCashFlow,p.capitalExpenditures,p.freeCashFlow].every(Number.isFinite)||Math.abs(p.operatingCashFlow+p.capitalExpenditures-p.freeCashFlow)>Math.max(2,Math.abs(p.freeCashFlow)*.002))){rejected.push(x.ticker+': invalid/reconciliation');continue;}
 if(!/^https:\/\/stockanalysis\.com\/quote\/jmse\//.test(x.url)){rejected.push(x.ticker+': invalid source');continue;}
 const prev=existing.get(x.ticker);
 existing.set(x.ticker,{ticker:x.ticker,currency:currency[x.ticker]||prev?.currency||'JMD',unit:'millions',source:'StockAnalysis',url:x.url,verification:'SA parsed and arithmetically checked; JSE reconciliation pending',periods});
 added++;
}
if(rejected.length){console.error('Rejected:',rejected.join('; '));process.exitCode=1;}
data.companies=[...existing.values()];
data.collectedAt=new Date().toISOString().slice(0,10);
data.note='StockAnalysis historical cash flows, values in millions. Financial-sector FCF may not be comparable. JSE cross-check pending.';
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log('Merged',added,'companies; dashboard now has',data.companies.length);
