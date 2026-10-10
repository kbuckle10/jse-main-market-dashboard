import fs from 'node:fs';
import { chromium } from 'playwright';
const data=JSON.parse(fs.readFileSync('data.json','utf8'));
const batch=(process.env.CASHFLOW_BATCH||'CCC,CAR,GK,TJH,NCBFG').split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36'});
const results=[];
function parseNumber(s){s=String(s||'').trim();if(!s||s==='-'||/^n\/?a$/i.test(s))return null;const n=Number(s.replace(/,/g,''));return Number.isFinite(n)?n:null}
for(const ticker of batch){
 const stock=data.stocks.find(s=>s.ticker===ticker);if(!stock){results.push({ticker,status:'not_in_universe'});continue}
 const market=(stock.saMarket||stock.primaryListing?.market||'jmse').toLowerCase();
 const symbol=stock.primaryListing?.ticker||stock.saTicker||ticker;
 const url='https://stockanalysis.com/quote/'+encodeURIComponent(market)+'/'+encodeURIComponent(symbol)+'/financials/cash-flow-statement/';
 try{
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
  const raw=await page.locator('table').allTextContents();
  const tables=await page.locator('table').evaluateAll(ts=>ts.map(t=>[...t.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(c=>c.innerText.trim()))));
  const table=tables.find(t=>t.some(r=>/^Operating Cash Flow$/i.test(r[0]||'')));
  if(!table)throw Error('No operating cash flow table');
  const headers=table.find(r=>r[0]==='Fiscal Year');
  const periods=table.find(r=>r[0]==='Period Ending');
  const operating=table.find(r=>r[0]==='Operating Cash Flow');
  const capex=tables.flat().find(r=>r[0]==='Capital Expenditures');
  const free=tables.flat().find(r=>r[0]==='Free Cash Flow');
  if(!headers||!operating||!capex||!free)throw Error('Missing mandatory cash flow rows');
  const records=[];
  for(let i=1;i<headers.length;i++){
   const ocf=parseNumber(operating[i]),capexValue=parseNumber(capex[i]),fcf=parseNumber(free[i]);
   if([ocf,capexValue,fcf].some(v=>v===null))continue;
   if(Math.abs(ocf+capexValue-fcf)>Math.max(2,Math.abs(fcf)*0.002))continue;
   records.push({period:headers[i],periodEnding:periods?.[i]||null,operatingCashFlow:ocf,capitalExpenditures:capexValue,freeCashFlow:fcf});
  }
  results.push({ticker,status:records.length?'parsed':'no_valid_records',url,currency:'JMD',units:'millions',records});
 }catch(e){results.push({ticker,status:'failed',url,error:String(e.message||e)})}
 console.log(ticker,results.at(-1).status,results.at(-1).records?.length||0);
}
await browser.close();
fs.mkdirSync('research',{recursive:true});
fs.writeFileSync('research/cashflow-batch-01.json',JSON.stringify({generatedAt:new Date().toISOString(),sourcePriority:['StockAnalysis','JSE'],results},null,2)+'\n');
if(results.some(r=>r.status!=='parsed'))process.exitCode=1;
