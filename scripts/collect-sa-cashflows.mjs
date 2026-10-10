// Collect five-year cash-flow history from StockAnalysis (S&P Global Market Intelligence).
// Run: node scripts/collect-sa-cashflows.mjs CCC CAR GK TJH NCBFG
// Writes research/sa-cashflows-batch.json; never overwrites dashboard data.
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
const tickers = process.argv.slice(2).length ? process.argv.slice(2) : ['CCC','CAR','GK','TJH','NCBFG'];
const browser = await chromium.launch({headless:true});
const results = [];
const toNumber = s => {
  const t = String(s ?? '').replace(/,/g,'').trim();
  if (!t || /^(?:-|—|n\/a)$/i.test(t)) return null;
  const v = Number(t.replace(/\$/g,'').replace(/\((.+)\)/,'-$1'));
  return Number.isFinite(v) ? v : null;
};
try {
  for(const ticker of tickers) {
    const url = 'https://stockanalysis.com/quote/jmse/'+encodeURIComponent(ticker)+'/financials/cash-flow-statement/';
    const page = await browser.newPage({userAgent:'Mozilla/5.0 (compatible; financial-research/1.0)'});
    const result = {ticker,url,source:'StockAnalysis / S&P Global Market Intelligence',status:'pending',periods:[]};
    try {
      const response = await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
      result.httpStatus=response?.status();
      if(!response?.ok()) throw Error('HTTP '+result.httpStatus);
      await page.locator('table').first().waitFor({timeout:20000});
      const tables = await page.locator('table').evaluateAll(nodes => nodes.map(table =>
        [...table.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('th,td')].map(td => td.innerText.trim()))
      ));
      const rows = tables.flat();
      const find = label => rows.find(r => r.length>2 && r[0]?.trim().toLowerCase()===label.toLowerCase());
      const fy = find('Fiscal Year');
      const end = find('Period Ending');
      const ocf = find('Operating Cash Flow');
      const capex = find('Capital Expenditures');
      const fcf = find('Free Cash Flow');
      if(!fy||!ocf||!capex||!fcf) throw Error('Required rows absent; possible layout change or access restriction');
      const count=Math.min(fy.length,ocf.length,capex.length,fcf.length);
      for(let i=1;i<count;i++){
        const period=fy[i], operatingCashFlow=toNumber(ocf[i]), capitalExpenditures=toNumber(capex[i]), freeCashFlow=toNumber(fcf[i]);
        if(!period || operatingCashFlow===null || capitalExpenditures===null || freeCashFlow===null) continue;
        // SA represents capital expenditures as a negative cash-flow line.
        const discrepancy=Math.abs(operatingCashFlow+capitalExpenditures-freeCashFlow);
        const tolerance=Math.max(2,Math.abs(freeCashFlow)*0.002);
        result.periods.push({period,periodEnding:end?.[i]??null,operatingCashFlow,capitalExpenditures,freeCashFlow,currency:'JMD',unit:'millions',fcfReconciles:discrepancy<=tolerance,sourceUrl:url});
      }
      result.status=result.periods.length?'parsed':'no_complete_periods';
    }catch(e){result.status='error';result.error=String(e.message||e)}
    finally{await page.close()}
    results.push(result);
    console.log(ticker,result.status,result.periods.length);
  }
}finally{await browser.close()}
await fs.mkdir('research',{recursive:true});
await fs.writeFile('research/sa-cashflows-batch.json',JSON.stringify({generatedAt:new Date().toISOString(),results},null,2)+'\n');
if(results.some(r=>r.status==='error')) process.exitCode=1;
