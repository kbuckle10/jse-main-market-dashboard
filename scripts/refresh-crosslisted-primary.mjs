import fs from 'node:fs';
import { chromium } from 'playwright';

const DATA_FILE='data.json';
const CONFIG={GHL:{market:'ttse',primaryTicker:'GHL',nativeCurrency:'TTD'}};
const PERIODS=[['m1','1M'],['ytd','YTD'],['m3','3M'],['m6','6M'],['y1','1Y']];
const read=()=>JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
const write=d=>fs.writeFileSync(DATA_FILE,JSON.stringify(d,null,2)+'\n');
const num=v=>{if(v==null)return null;const n=Number(String(v).replace(/[,$%x]/gi,'').trim());return Number.isFinite(n)?n:null};
const grab=(text,patterns)=>{for(const p of patterns){const m=text.match(p);if(m)return m[1].trim()}return null};
async function go(page,url){for(let i=0;i<3;i++)try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForLoadState('load',{timeout:8000}).catch(()=>{});await page.keyboard.press('Escape').catch(()=>{});return true}catch(e){if(i===2)console.warn(`goto failed ${url}: ${e.message}`);else await page.waitForTimeout(1000*(i+1))}return false}
function parseStats(text){return{pe:num(grab(text,[/PE Ratio\s*([0-9.]+)/i,/P\/E Ratio\s*([0-9.]+)/i])),pb:num(grab(text,[/PB Ratio\s*([0-9.]+)/i,/P\/B Ratio\s*([0-9.]+)/i,/Price\/Book\s*([0-9.]+)/i])),roe:num(grab(text,[/Return on Equity \(ROE\)\s*([+-]?[0-9.]+)%/i,/ROE\s*([+-]?[0-9.]+)%/i])),eps:num(grab(text,[/EPS \(ttm\)\s*([+-]?[0-9.]+)/i,/Earnings Per Share \(EPS\)\s*([+-]?[0-9.]+)/i,/EPS\s*([+-]?[0-9.]+)/i])),bvps:num(grab(text,[/Book Value Per Share\s*([+-]?[0-9.]+)/i])),epsGrowth:num(grab(text,[/EPS Growth\s*([+-]?[0-9.]+)%/i]))}}
function parseDividend(text){const pair=text.match(/Dividend\s*(?:TT\$|J\$|US\$|\$)?\s*([0-9.]+)\s*\(([0-9.]+)%\)/i);return{dps:num(grab(text,[/Annual Dividend\s*(?:TT\$|J\$|US\$|\$)?\s*([0-9.]+)/i,/Dividend \(ttm\)\s*(?:TT\$|J\$|US\$|\$)?\s*([0-9.]+)/i]))??(pair?num(pair[1]):null),yield:num(grab(text,[/Dividend Yield\s*([0-9.]+)%/i]))??(pair?num(pair[2]):null)}}
function returnRegex(label){const e=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return new RegExp(`([+-]?\\d+(?:\\.\\d+)?)%\\s*\\(${e}\\)`,'i')}
async function clickLabel(page,label){for(const loc of [page.getByText(label,{exact:true}),page.locator('button').filter({hasText:new RegExp(`^\\s*${label}\\s*$`)}),page.locator('a').filter({hasText:new RegExp(`^\\s*${label}\\s*$`)})]){for(let i=0,n=await loc.count().catch(()=>0);i<n;i++){const el=loc.nth(i);if(await el.isVisible().catch(()=>false)&&await el.click({force:true,timeout:2000}).then(()=>true).catch(()=>false))return true}}return false}
async function capturePeriod(page,label){if(!await clickLabel(page,label))return null;const re=returnRegex(label);for(let i=0;i<12;i++){await page.waitForTimeout(250);const body=await page.locator('body').innerText().catch(()=>'');const m=body.match(re);if(m)return Number(m[1])}return null}
async function historyRows(page){const rows=await page.locator('table tbody tr').evaluateAll(trs=>trs.map(tr=>Array.from(tr.querySelectorAll('td')).map(td=>td.textContent?.trim()||''))).catch(()=>[]);return rows.filter(r=>r.length>=5).map(r=>({date:new Date(r[0]),close:Number(String(r[4]).replace(/,/g,''))})).filter(r=>!Number.isNaN(r.date.valueOf())&&Number.isFinite(r.close))}
function histReturn(rows,days){if(rows.length<2)return null;const sorted=[...rows].sort((a,b)=>b.date-a.date),latest=sorted[0],target=new Date(latest.date);target.setDate(target.getDate()-days);const old=sorted.find(r=>r.date<=target);return old?((latest.close/old.close)-1)*100:null}

const data=read();const browser=await chromium.launch({headless:true});const ctx=await browser.newContext({viewport:{width:1440,height:1000},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36'});
for(const [ticker,cfg] of Object.entries(CONFIG)){
  const s=data.stocks.find(x=>x.ticker===ticker);if(!s)continue;
  console.log(`=== ${ticker}: StockAnalysis ${cfg.market.toUpperCase()} primary listing ===`);
  let research='',dividend='';const overview=await ctx.newPage();
  try{const base=`https://stockanalysis.com/quote/${cfg.market}/${cfg.primaryTicker}/`;if(await go(overview,base)){research+='\n'+await overview.locator('body').innerText().catch(()=>'');for(const [field,label] of PERIODS){const v=await capturePeriod(overview,label);if(Number.isFinite(v))s[field]=Number(v.toFixed(2))}}}finally{await overview.close()}
  for(const suffix of ['financials/','statistics/']){const p=await ctx.newPage();try{if(await go(p,`https://stockanalysis.com/quote/${cfg.market}/${cfg.primaryTicker}/${suffix}`))research+='\n'+await p.locator('body').innerText().catch(()=>'')}finally{await p.close()}}
  const dp=await ctx.newPage();try{if(await go(dp,`https://stockanalysis.com/quote/${cfg.market}/${cfg.primaryTicker}/dividend/`))dividend=await dp.locator('body').innerText().catch(()=>'')}finally{await dp.close()}
  const hp=await ctx.newPage();try{if(await go(hp,`https://stockanalysis.com/quote/${cfg.market}/${cfg.primaryTicker}/history/`)){await hp.waitForSelector('table tbody tr',{timeout:12000}).catch(()=>{});const rows=await historyRows(hp),w1=histReturn(rows,7);if(Number.isFinite(w1))s.w1=Number(w1.toFixed(2))}}finally{await hp.close()}
  const st=parseStats(research),dv=parseDividend(dividend),jsePrice=num(s.price);
  s.saMarket=cfg.market;s.saTicker=cfg.primaryTicker;s.saUrl=`https://stockanalysis.com/quote/${cfg.market}/${cfg.primaryTicker}/`;
  s.primaryListing={market:cfg.market.toUpperCase(),ticker:cfg.primaryTicker,currency:cfg.nativeCurrency,source:'StockAnalysis',url:s.saUrl};
  s.fundamentalSource=`SA ${cfg.market.toUpperCase()} primary`;s.performanceSource=`SA ${cfg.market.toUpperCase()} primary`;
  s.nativeCurrency=cfg.nativeCurrency;s.nativeEps=st.eps;s.nativeBvps=st.bvps;s.nativeDps=dv.dps;
  if(st.pe!=null)s.pe=Number(st.pe.toFixed(2));if(st.pb!=null)s.pb=Number(st.pb.toFixed(2));if(st.roe!=null)s.roe=Number(st.roe.toFixed(2));if(st.epsGrowth!=null)s.epsGrowth=Number(st.epsGrowth.toFixed(2));if(dv.yield!=null)s.divYield=Number(dv.yield.toFixed(2));
  // Never divide a JMD price by raw TTD EPS/BVPS. Use the primary-listing ratios to express JMD-equivalent per-share values for dashboard arithmetic.
  if(jsePrice&&st.pe>0){s.eps=Number((jsePrice/st.pe).toFixed(4));s.epsSource=`SA ${cfg.market.toUpperCase()} ratio-equivalent`;}
  if(jsePrice&&st.pb>0){s.bvps=Number((jsePrice/st.pb).toFixed(4));s.bvpsSource=`SA ${cfg.market.toUpperCase()} ratio-equivalent`;}
  if(jsePrice&&dv.yield!=null){s.dps=Number((jsePrice*dv.yield/100).toFixed(4));s.dpsSource=`SA ${cfg.market.toUpperCase()} yield-equivalent`;}
  s.crossListed=true;s.crossListedNote=`JSE price; StockAnalysis ${cfg.market.toUpperCase()} primary-listing fundamentals/history`;
  console.log(`GHL JSE price=${jsePrice} | TTSE PE=${s.pe} PB=${s.pb} ROE=${s.roe} EPSg=${s.epsGrowth} Yield=${s.divYield}`);
}
await browser.close();data.crossListedPrimaryUpdated=new Date().toISOString();write(data);
