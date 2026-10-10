import fs from 'node:fs';
const file='cashflow-data.json', input=process.argv[2]||'research/sa-cashflows-batch.json';
const data=JSON.parse(fs.readFileSync(file,'utf8')), incoming=JSON.parse(fs.readFileSync(input,'utf8'));
const currency={TJH:'USD',CPJ:'USD',MASSY:'TTD',GHL:'TTD',KPREIT:'USD',FIRSTROCKJMD:'USD'};
const existing=new Map(data.companies.map(x=>[x.ticker,x]));
let added=0, rejected=[];
for(const x of incoming.results||[]){
 if(x.status!=='parsed'||!Array.isArray(x.periods)||x.periods.length<3){rejected.push(x.ticker+': missing periods');continue;}
 const flexible=x.periods.some(p=>p.method==='operating_and_investing_disclosed'||p.method==='real_estate_operating_and_investing');
 const periods=x.periods.map(p=>({period:p.period,periodEnding:p.periodEnding,operatingCashFlow:p.operatingCashFlow,capitalExpenditures:p.capitalExpenditures,freeCashFlow:p.freeCashFlow,realEstateAcquisitions:p.realEstateAcquisitions??null,realEstateSales:p.realEstateSales??null,investingCashFlow:p.investingCashFlow??null,leveredFreeCashFlow:p.leveredFreeCashFlow??null,unleveredFreeCashFlow:p.unleveredFreeCashFlow??null,method:p.method||'conventional_fcf'}));
 const validPeriods=periods.filter(p=>{
  if(!p.periodEnding||!Number.isFinite(p.operatingCashFlow))return false;
  if(flexible)return [p.realEstateAcquisitions,p.investingCashFlow,p.leveredFreeCashFlow,p.unleveredFreeCashFlow,p.freeCashFlow].some(Number.isFinite);
  return [p.capitalExpenditures,p.freeCashFlow].every(Number.isFinite)&&Math.abs(p.operatingCashFlow+p.capitalExpenditures-p.freeCashFlow)<=Math.max(2,Math.abs(p.freeCashFlow)*.002);
 });
 if(validPeriods.length<3){rejected.push(x.ticker+': only '+validPeriods.length+'/'+periods.length+' valid periods');continue;}
 if(!/^https:\/\/stockanalysis\.com\/quote\/(jmse|ttse)\//.test(x.url)){rejected.push(x.ticker+': invalid source');continue;}
 const prev=existing.get(x.ticker);
 existing.set(x.ticker,{ticker:x.ticker,currency:currency[x.ticker]||prev?.currency||'JMD',unit:'millions',source:'StockAnalysis',url:x.url,verification:flexible?'SA operating/investing or separately disclosed FCF; conventional FCF not inferred; JSE reconciliation pending':'SA parsed and arithmetically checked; JSE reconciliation pending',periods:validPeriods});
 added++;
}
if(rejected.length){console.error('Skipped unverified companies:',rejected.join('; '));}
data.companies=[...existing.values()];
data.collectedAt=new Date().toISOString().slice(0,10);
data.note='StockAnalysis historical cash flows, values in millions. Financial-sector FCF may not be comparable. JSE cross-check pending.';
fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
console.log('Merged',added,'companies; dashboard now has',data.companies.length);
