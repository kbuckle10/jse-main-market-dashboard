import fs from 'node:fs';
import { chromium } from 'playwright';

const FILE='data.json';
const data=JSON.parse(fs.readFileSync(FILE,'utf8'));
const num=v=>{if(v==null)return null;const s=String(v).replace(/,/g,'').replace(/%/g,'').replace(/[x×]/g,'').trim();if(!s||/^n\/?a$/i.test(s)||/^--$/.test(s))return null;const n=Number(s);return Number.isFinite(n)?n:null};
async function go(page,url){for(let i=1;i<=3;i++){try{await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForLoadState('load',{timeout:8000}).catch(()=>{});await page.keyboard.press('Escape').catch(()=>{});return true}catch(e){console.warn(`goto ${i}/3 failed ${url}: ${e.message}`);if(i<3)await page.waitForTimeout(i*900)}}return false}
function lines(text){return String(text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean)}
function cleanLabel(s){return s.toLowerCase().replace(/[()]/g,'').replace(/\s+/g,' ').trim()}
function firstNumeric(s,{percent=false}={}){if(!s)return null;const re=percent?/([+-]?\d[\d,.]*)\s*%/:/([+-]?\d[\d,.]*)/;const m=String(s).match(re);return m?num(m[1]):null}
function valueByLabel(text,labels,{percent=false}={}){
  const ls=lines(text), wanted=labels.map(cleanLabel);
  for(let i=0;i<ls.length;i++){
    const raw=ls[i], norm=cleanLabel(raw.split('|')[0]);
    for(const label of wanted){
      if(norm===label||norm.startsWith(label+' ')||cleanLabel(raw).startsWith(label+' |')){
        const pipe=raw.indexOf('|');
        if(pipe>=0){const v=firstNumeric(raw.slice(pipe+1),{percent});if(v!=null)return v;if(/n\/?a/i.test(raw.slice(pipe+1)))return null}
        const after=raw.replace(new RegExp('^'+labels.find(x=>cleanLabel(x)===label)?.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i'),'').replace(/^\s*[|:]?\s*/,'');
        const same=firstNumeric(after,{percent});if(same!=null)return same;
        for(let j=i+1;j<=Math.min(i+2,ls.length-1);j++){
          if(/^[A-Za-z]/.test(ls[j])&&!/[0-9]/.test(ls[j]))break;
          const v=firstNumeric(ls[j],{percent});if(v!=null)return v;
          if(/n\/?a/i.test(ls[j]))return null;
        }
      }
    }
  }
  return null;
}
function epsGrowthFromOverview(text){
  for(const line of lines(text)){
    if(/^EPS\b/i.test(line)){
      const p=[...line.matchAll(/([+-]?\d[\d,.]*)\s*%/g)];
      if(p.length)return num(p[p.length-1][1]);
    }
  }
  return valueByLabel(text,['EPS Growth'],{percent:true});
}
function extractStats(text){return{
 pe:valueByLabel(text,['PE Ratio','P/E Ratio']),
 forwardPe:valueByLabel(text,['Forward PE','Forward P/E']),
 ps:valueByLabel(text,['PS Ratio','P/S Ratio']),
 pb:valueByLabel(text,['PB Ratio','P/B Ratio','Price/Book']),
 pfcf:valueByLabel(text,['P/FCF Ratio','Price/Free Cash Flow']),
 peg:valueByLabel(text,['PEG Ratio']),
 evSales:valueByLabel(text,['EV / Sales','EV/Sales']),
 evEbitda:valueByLabel(text,['EV / EBITDA','EV/EBITDA']),
 evFcf:valueByLabel(text,['EV / FCF','EV/FCF','EV / Free Cash Flow']),
 earningsYield:valueByLabel(text,['Earnings Yield'],{percent:true}),
 fcfYield:valueByLabel(text,['FCF Yield','Free Cash Flow Yield'],{percent:true}),
 dividendYield:valueByLabel(text,['Dividend Yield'],{percent:true}),
 roe:valueByLabel(text,['Return on Equity (ROE)','ROE'],{percent:true}),
 roa:valueByLabel(text,['Return on Assets (ROA)','ROA'],{percent:true}),
 roic:valueByLabel(text,['Return on Invested Capital (ROIC)','ROIC'],{percent:true}),
 currentRatio:valueByLabel(text,['Current Ratio']),
 quickRatio:valueByLabel(text,['Quick Ratio']),
 debtEquity:valueByLabel(text,['Debt / Equity','Debt to Equity']),
 interestCoverage:valueByLabel(text,['Interest Coverage']),
 assetTurnover:valueByLabel(text,['Asset Turnover']),
 grossMargin:valueByLabel(text,['Gross Margin'],{percent:true}),
 operatingMargin:valueByLabel(text,['Operating Margin'],{percent:true}),
 netMargin:valueByLabel(text,['Profit Margin','Net Margin'],{percent:true}),
 eps:valueByLabel(text,['Earnings Per Share (EPS)','EPS']),
 bvps:valueByLabel(text,['Book Value Per Share']),
 dps:valueByLabel(text,['Dividend Per Share','Annual Dividend'])
}}
function mark(stock,key,state,detail=null){stock.metricStatus??={};stock.metricStatus[key]={state,detail,checkedAt:new Date().toISOString()}}
function setSa(stock,key,val,detail='Published by StockAnalysis'){if(val==null)return false;stock[key]=Number(val.toFixed(4));stock[`${key}Source`]=stock.saMarket&&stock.saMarket!=='jmse'?`SA ${stock.saMarket.toUpperCase()}`:'SA';mark(stock,key,'ok',detail);return true}
function calcFallback(stock,key){
 if(key==='pe'&&stock.price!=null&&stock.eps>0)return Number((stock.price/stock.eps).toFixed(2));
 if(key==='pb'&&stock.price!=null&&stock.bvps!==0&&stock.bvps!=null)return Number((stock.price/stock.bvps).toFixed(2));
 if(key==='divYield'&&stock.price>0&&stock.dps!=null)return Number((stock.dps/stock.price*100).toFixed(2));
 return null;
}
const browser=await chromium.launch({headless:true});
const ctx=await browser.newContext({viewport:{width:1600,height:1100},userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36'});
let checked=0,failed=0;
for(const stock of data.stocks){
 const market=(stock.saMarket||stock.primaryListing?.market||'jmse').toLowerCase();
 const ticker=encodeURIComponent(stock.primaryListing?.ticker||stock.saTicker||stock.ticker);
 const base=`https://stockanalysis.com/quote/${market}/${ticker}/`;
 console.log(`\n=== ${stock.ticker} SA (${market.toUpperCase()}) ===`);
 const pages={};const errors=[];
 for(const [name,suffix] of [['overview',''],['statistics','statistics/'],['ratios','financials/ratios/'],['dividend','dividend/']]){
   const p=await ctx.newPage();
   try{if(await go(p,base+suffix)){pages[name]=await p.locator('body').innerText().catch(()=>'')}else errors.push(name)}finally{await p.close()}
 }
 if(!pages.statistics&&!pages.overview){failed++;for(const k of ['pe','pb','roe','epsGrowth','divYield'])mark(stock,k,'error',`StockAnalysis core pages failed: ${errors.join(', ')}`);continue}
 checked++;
 const st=extractStats(pages.statistics||'');
 const rt=extractStats(pages.ratios||'');
 const ov=extractStats(pages.overview||'');
 const dv=extractStats(pages.dividend||'');
 const epsGrowth=epsGrowthFromOverview(pages.overview||'');
 const pick=(...vals)=>vals.find(v=>v!=null)??null;
 const m={
   pe:pick(st.pe,ov.pe,rt.pe),forwardPe:pick(st.forwardPe,ov.forwardPe,rt.forwardPe),ps:pick(st.ps,rt.ps),pb:pick(st.pb,rt.pb),pfcf:pick(st.pfcf,rt.pfcf),peg:pick(st.peg,rt.peg),
   evSales:pick(st.evSales,rt.evSales),evEbitda:pick(st.evEbitda,rt.evEbitda),evFcf:pick(st.evFcf,rt.evFcf),earningsYield:pick(st.earningsYield,rt.earningsYield),fcfYield:pick(st.fcfYield,rt.fcfYield),
   dividendYield:pick(st.dividendYield,dv.dividendYield,ov.dividendYield),roe:pick(st.roe,rt.roe),roa:pick(st.roa,rt.roa),roic:pick(st.roic,rt.roic),currentRatio:pick(st.currentRatio,rt.currentRatio),quickRatio:pick(st.quickRatio,rt.quickRatio),
   debtEquity:pick(st.debtEquity,rt.debtEquity),interestCoverage:pick(st.interestCoverage,rt.interestCoverage),assetTurnover:pick(st.assetTurnover,rt.assetTurnover),grossMargin:pick(st.grossMargin,rt.grossMargin),operatingMargin:pick(st.operatingMargin,rt.operatingMargin),netMargin:pick(st.netMargin,rt.netMargin),
   eps:pick(st.eps,ov.eps),bvps:st.bvps,dps:pick(st.dps,dv.dps),epsGrowth
 };
 stock.saUrl=base;stock.saMarket=market;
 stock.saAnalystMetrics={source:'StockAnalysis',market:market.toUpperCase(),url:base,updatedAt:new Date().toISOString(),...m};
 const cross=stock.crossListed||market!=='jmse';
 if(m.pe!=null)setSa(stock,'pe',m.pe,`Published by StockAnalysis ${market.toUpperCase()} Statistics`);else{const f=calcFallback(stock,'pe');if(f!=null){stock.pe=f;stock.peSource='CALC';mark(stock,'pe','fallback','StockAnalysis P/E not published; calculated fallback used')}else mark(stock,'pe','na','StockAnalysis checked; P/E not published and no fallback')}
 if(m.pb!=null)setSa(stock,'pb',m.pb,`Published by StockAnalysis ${market.toUpperCase()} Statistics`);else{const f=calcFallback(stock,'pb');if(f!=null){stock.pb=f;stock.pbSource='CALC';mark(stock,'pb','fallback','StockAnalysis P/B not published; calculated fallback used')}else mark(stock,'pb','na','StockAnalysis checked; P/B not published and no fallback')}
 if(m.roe!=null)setSa(stock,'roe',m.roe,`Published by StockAnalysis ${market.toUpperCase()} Statistics`);else if(stock.roe!=null)mark(stock,'roe','fallback','Retaining previously sourced ROE');else mark(stock,'roe','na','StockAnalysis checked; ROE not published')
 if(m.epsGrowth!=null)setSa(stock,'epsGrowth',m.epsGrowth,`Published by StockAnalysis ${market.toUpperCase()} Overview`);else if(stock.epsGrowth!=null)mark(stock,'epsGrowth','fallback','Retaining previously sourced EPS growth');else mark(stock,'epsGrowth','na','StockAnalysis Overview checked; EPS growth not published')
 if(m.dividendYield!=null)setSa(stock,'divYield',m.dividendYield,`Published by StockAnalysis ${market.toUpperCase()} Statistics/Dividend`);else{const f=calcFallback(stock,'divYield');if(f!=null){stock.divYield=f;stock.divYieldSource='CALC';mark(stock,'divYield','fallback','StockAnalysis dividend yield not published; calculated fallback used')}else mark(stock,'divYield','na','StockAnalysis checked; dividend yield not published')}
 if(cross){
   if(m.eps!=null){stock.eps=Number(m.eps.toFixed(4));stock.epsSource=`SA ${market.toUpperCase()}`;stock.epsCurrency=stock.nativeCurrency||stock.primaryListing?.currency||null;mark(stock,'eps','ok',`Published by StockAnalysis ${market.toUpperCase()} Statistics`)}
   if(m.bvps!=null){stock.bvps=Number(m.bvps.toFixed(4));stock.bvpsSource=`SA ${market.toUpperCase()}`;stock.bvpsCurrency=stock.nativeCurrency||stock.primaryListing?.currency||null;mark(stock,'bvps','ok',`Published by StockAnalysis ${market.toUpperCase()} Statistics`)}
   if(m.dps!=null){stock.dps=Number(m.dps.toFixed(4));stock.dpsSource=`SA ${market.toUpperCase()}`;stock.dpsCurrency=stock.nativeCurrency||stock.primaryListing?.currency||null;mark(stock,'dps','ok',`Published by StockAnalysis ${market.toUpperCase()} Statistics/Dividend`)}
 }else{
   if(m.eps!=null)setSa(stock,'eps',m.eps);else if(stock.eps!=null)mark(stock,'eps','fallback','Retaining previously sourced EPS');else mark(stock,'eps','na','StockAnalysis checked; EPS not published');
   if(m.bvps!=null)setSa(stock,'bvps',m.bvps);else if(stock.bvps!=null)mark(stock,'bvps','fallback','Retaining previously sourced BVPS');else mark(stock,'bvps','na','StockAnalysis checked; BVPS not published');
   if(m.dps!=null)setSa(stock,'dps',m.dps);else if(stock.dps!=null)mark(stock,'dps','fallback','Retaining previously sourced DPS');else mark(stock,'dps','na','StockAnalysis checked; DPS not published');
 }
 console.log(`SA published PE=${m.pe??'N/A'} PB=${m.pb??'N/A'} ROE=${m.roe??'N/A'} EPS=${m.eps??'N/A'} EPSg=${m.epsGrowth??'N/A'} BVPS=${m.bvps??'N/A'} Yield=${m.dividendYield??'N/A'}`);
}
await browser.close();
data.saRatiosUpdated=new Date().toISOString();data.refreshedAt=data.saRatiosUpdated;
fs.writeFileSync(FILE,JSON.stringify(data,null,2)+'\n');
console.log(`SUCCESS: SA enrichment checked ${checked}/${data.stocks.length}; core page failures ${failed}. SA-published values take precedence; CALC is fallback only.`);
