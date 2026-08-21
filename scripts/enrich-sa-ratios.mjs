import fs from 'node:fs';
import { chromium } from 'playwright';

const FILE='data.json';
const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const num=v=>{if(v==null)return null;const s=String(v).replace(/,/g,'').replace(/%/g,'').replace(/[x×]/g,'').trim();if(!s||/^n\/?a$/i.test(s)||/^--$/.test(s))return null;const n=Number(s);return Number.isFinite(n)?n:null};
const grab=(text,patterns)=>{for(const re of patterns){const m=text.match(re);if(m){const n=num(m[1]);if(n!=null)return n}}return null};
async function go(page,url){for(let i=1;i<=3;i++){try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForLoadState('load',{timeout:8000}).catch(()=>{});await page.keyboard.press('Escape').catch(()=>{});return true}catch(e){console.warn(`goto ${i}/3 failed ${url}: ${e.message}`);if(i<3)await page.waitForTimeout(i*900)}}return false}
function extract(text){return{
 pe:grab(text,[/P\/E Ratio\s*\n?\s*([0-9.]+)/i,/PE Ratio\s*\n?\s*([0-9.]+)/i,/Price\/Earnings\s*\n?\s*([0-9.]+)/i]),
 forwardPe:grab(text,[/Forward P\/E\s*\n?\s*([0-9.]+)/i,/Forward PE\s*\n?\s*([0-9.]+)/i]),
 ps:grab(text,[/P\/S Ratio\s*\n?\s*([0-9.]+)/i,/Price\/Sales\s*\n?\s*([0-9.]+)/i]),
 pb:grab(text,[/P\/B Ratio\s*\n?\s*([0-9.]+)/i,/PB Ratio\s*\n?\s*([0-9.]+)/i,/Price\/Book\s*\n?\s*([0-9.]+)/i]),
 pfcf:grab(text,[/P\/FCF Ratio\s*\n?\s*([0-9.]+)/i,/Price\/Free Cash Flow\s*\n?\s*([0-9.]+)/i]),
 peg:grab(text,[/PEG Ratio\s*\n?\s*([0-9.]+)/i]),
 evSales:grab(text,[/EV\/Sales\s*\n?\s*([0-9.]+)/i]),
 evEbitda:grab(text,[/EV\/EBITDA\s*\n?\s*([0-9.]+)/i]),
 evFcf:grab(text,[/EV\/FCF\s*\n?\s*([0-9.]+)/i,/EV\/Free Cash Flow\s*\n?\s*([0-9.]+)/i]),
 earningsYield:grab(text,[/Earnings Yield\s*\n?\s*([+-]?[0-9.]+)%/i]),
 fcfYield:grab(text,[/FCF Yield\s*\n?\s*([+-]?[0-9.]+)%/i,/Free Cash Flow Yield\s*\n?\s*([+-]?[0-9.]+)%/i]),
 dividendYield:grab(text,[/Dividend Yield\s*\n?\s*([0-9.]+)%/i]),
 roe:grab(text,[/Return on Equity \(ROE\)\s*\n?\s*([+-]?[0-9.]+)%/i,/\bROE\s*\n?\s*([+-]?[0-9.]+)%/i]),
 roa:grab(text,[/Return on Assets \(ROA\)\s*\n?\s*([+-]?[0-9.]+)%/i,/\bROA\s*\n?\s*([+-]?[0-9.]+)%/i]),
 roic:grab(text,[/Return on Invested Capital \(ROIC\)\s*\n?\s*([+-]?[0-9.]+)%/i,/\bROIC\s*\n?\s*([+-]?[0-9.]+)%/i]),
 currentRatio:grab(text,[/Current Ratio\s*\n?\s*([0-9.]+)/i]),
 quickRatio:grab(text,[/Quick Ratio\s*\n?\s*([0-9.]+)/i]),
 debtEquity:grab(text,[/Debt\s*\/\s*Equity\s*\n?\s*([0-9.]+)/i,/Debt to Equity\s*\n?\s*([0-9.]+)/i]),
 interestCoverage:grab(text,[/Interest Coverage\s*\n?\s*([0-9.]+)/i]),
 assetTurnover:grab(text,[/Asset Turnover\s*\n?\s*([0-9.]+)/i]),
 grossMargin:grab(text,[/Gross Margin\s*\n?\s*([+-]?[0-9.]+)%/i]),
 operatingMargin:grab(text,[/Operating Margin\s*\n?\s*([+-]?[0-9.]+)%/i]),
 netMargin:grab(text,[/Profit Margin\s*\n?\s*([+-]?[0-9.]+)%/i,/Net Margin\s*\n?\s*([+-]?[0-9.]+)%/i]),
 eps:grab(text,[/Earnings Per Share \(EPS\)\s*\n?\s*([+-]?[0-9.]+)/i,/EPS \(ttm\)\s*\n?\s*([+-]?[0-9.]+)/i]),
 bvps:grab(text,[/Book Value Per Share\s*\n?\s*([+-]?[0-9.]+)/i]),
 dps:grab(text,[/Dividend Per Share\s*\n?\s*([0-9.]+)/i,/Annual Dividend\s*(?:TT\$|J\$|US\$|\$)?\s*([0-9.]+)/i]),
 epsGrowth:grab(text,[/EPS Growth\s*\n?\s*([+-]?[0-9.]+)%/i])
}}
function mark(stock,key,state,detail=null){stock.metricStatus??={};stock.metricStatus[key]={state,detail,checkedAt:new Date().toISOString()}}
function direct(stock,key,val){if(val==null)return false;stock[key]=Number(val.toFixed(4));stock[`${key}Source`]='SA';mark(stock,key,'ok','Published by StockAnalysis');return true}

const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1600,height:1100},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36'});
let checked=0,failed=0;
for(const stock of data.stocks){
 const market=(stock.saMarket||stock.primaryListing?.market||'jmse').toLowerCase();
 const ticker=encodeURIComponent(stock.primaryListing?.ticker||stock.saTicker||stock.ticker);
 const base=`https://stockanalysis.com/quote/${market}/${ticker}/`;
 console.log(`\n=== ${stock.ticker} ratios (${market.toUpperCase()}) ===`);
 let combined='',anyOk=false,errors=[];
 for(const suffix of ['financials/ratios/','statistics/','dividend/']){
   const p=await ctx.newPage();
   try{const ok=await go(p,base+suffix);if(ok){anyOk=true;combined+='\n'+await p.locator('body').innerText().catch(()=>'')}else errors.push(suffix)}finally{await p.close()}
 }
 if(!anyOk){failed++;for(const k of ['pe','pb','roe','epsGrowth','divYield'])mark(stock,k,'error',`StockAnalysis pages could not be fetched: ${errors.join(', ')}`);continue}
 checked++;
 const r=extract(combined);stock.saAnalystMetrics={source:'StockAnalysis',market:market.toUpperCase(),url:base,updatedAt:new Date().toISOString(),forwardPe:r.forwardPe,ps:r.ps,pfcf:r.pfcf,peg:r.peg,evSales:r.evSales,evEbitda:r.evEbitda,evFcf:r.evFcf,earningsYield:r.earningsYield,fcfYield:r.fcfYield,roa:r.roa,roic:r.roic,currentRatio:r.currentRatio,quickRatio:r.quickRatio,debtEquity:r.debtEquity,interestCoverage:r.interestCoverage,assetTurnover:r.assetTurnover,grossMargin:r.grossMargin,operatingMargin:r.operatingMargin,netMargin:r.netMargin};
 const cross=stock.crossListed||market!=='jmse';
 if(direct(stock,'pe',r.pe)){}else if(stock.pe!=null){stock.peSource=stock.peSource||'CALC';mark(stock,'pe','fallback','Published SA P/E not found; using calculation fallback')}else mark(stock,'pe','na','SA pages checked; P/E not published and no defensible fallback');
 if(direct(stock,'pb',r.pb)){}else if(stock.pb!=null){stock.pbSource=stock.pbSource||'CALC';mark(stock,'pb','fallback','Published SA P/B not found; using calculation fallback')}else mark(stock,'pb','na','SA pages checked; P/B not published and no defensible fallback');
 if(direct(stock,'roe',r.roe)){}else if(stock.roe!=null){mark(stock,'roe','fallback','Published SA ROE not found; retaining previously sourced value')}else mark(stock,'roe','na','SA pages checked; ROE not published');
 if(r.epsGrowth!=null){stock.epsGrowth=Number(r.epsGrowth.toFixed(4));stock.epsGrowthSource='SA';mark(stock,'epsGrowth','ok','Published by StockAnalysis')}else if(stock.epsGrowth!=null)mark(stock,'epsGrowth','fallback','Retaining SA overview/statistics EPS growth');else mark(stock,'epsGrowth','na','SA pages checked; EPS growth not published');
 if(r.dividendYield!=null){stock.divYield=Number(r.dividendYield.toFixed(4));stock.divYieldSource='SA';mark(stock,'divYield','ok','Published by StockAnalysis')}else if(stock.divYield!=null){stock.divYieldSource=stock.divYieldSource||'CALC';mark(stock,'divYield','fallback','Published SA yield not found; using calculation fallback')}else mark(stock,'divYield','na','SA pages checked; dividend yield not published');
 if(cross){stock.nativeEps=r.eps??stock.nativeEps;stock.nativeBvps=r.bvps??stock.nativeBvps;stock.nativeDps=r.dps??stock.nativeDps}else{
   if(r.eps!=null){stock.eps=Number(r.eps.toFixed(4));stock.epsSource='SA';mark(stock,'eps','ok','Published by StockAnalysis')}else if(stock.eps!=null)mark(stock,'eps','fallback','Retaining SA overview/statistics EPS');else mark(stock,'eps','na','SA pages checked; EPS not published');
   if(r.bvps!=null){stock.bvps=Number(r.bvps.toFixed(4));stock.bvpsSource='SA';mark(stock,'bvps','ok','Published by StockAnalysis')}else if(stock.bvps!=null)mark(stock,'bvps','fallback','Retaining SA statistics BVPS');else mark(stock,'bvps','na','SA pages checked; BVPS not published');
   if(r.dps!=null){stock.dps=Number(r.dps.toFixed(4));stock.dpsSource='SA';mark(stock,'dps','ok','Published by StockAnalysis')}else if(stock.dps!=null)mark(stock,'dps','fallback','Retaining previously sourced DPS');else mark(stock,'dps','na','SA pages checked; DPS not published');
 }
 console.log(`SA direct PE=${r.pe??'N/A'} PB=${r.pb??'N/A'} ROE=${r.roe??'N/A'} EPSg=${r.epsGrowth??'N/A'} Yield=${r.dividendYield??'N/A'} EV/EBITDA=${r.evEbitda??'N/A'} ROIC=${r.roic??'N/A'}`);
}
await browser.close();
data.saRatiosUpdated=new Date().toISOString();data.refreshedAt=data.saRatiosUpdated;
fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
console.log(`SUCCESS: SA ratio/statistics enrichment checked ${checked}/${data.stocks.length}; page-set failures ${failed}. Published SA ratios override calculations; calculations remain fallback only.`);
