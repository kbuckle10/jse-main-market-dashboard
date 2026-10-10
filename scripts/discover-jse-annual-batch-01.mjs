// JSE annual report discovery, batch 1. Metadata only; no unverified cash-flow values.
import fs from 'node:fs/promises';
const tickers = ['CCC','CAR','GK','TJH','NCBFG'];
const output = { generatedAt:new Date().toISOString(), batch:1, entries:[] };
const browserHeaders = { 'User-Agent':'Mozilla/5.0 (compatible; JSEFinancialResearch/1.0)', 'Accept':'text/html,application/xhtml+xml' };
for (const ticker of tickers) {
  const archiveUrl = 'https://www.jamstockex.com/?tag='+encodeURIComponent(ticker)+'&category_name=annual-reports';
  const entry = {ticker,archiveUrl,status:'unverified',reports:[]};
  try {
    const response = await fetch(archiveUrl,{headers:browserHeaders,signal:AbortSignal.timeout(20000)});
    entry.httpStatus=response.status;
    if (!response.ok) throw Error('HTTP '+response.status);
    const html=await response.text();
    const matches=[...html.matchAll(/href=["'](https?:\\/\\/[^"']+|\\/[^"']+)["'][^>]*>([\\s\\S]{0,300}?)<\\/a>/gi)];
    const seen=new Set();
    for(const m of matches){
      const label=m[2].replace(/<[^>]+>/g,' ').replace(/\\s+/g,' ').trim();
      const url=new URL(m[1],archiveUrl).href;
      if (!url.startsWith('https://www.jamstockex.com/') || !/annual.report|annual-report|\\.pdf/i.test(label+' '+url) || seen.has(url)) continue;
      seen.add(url);
      entry.reports.push({url,title:label,verifiedTicker:false,statementExtracted:false});
    }
    entry.status=entry.reports.length?'discovered_needs_verification':'no_report_links_found';
  } catch(e){entry.status='fetch_failed';entry.error=String(e.message||e)}
  output.entries.push(entry);
  console.log(ticker,entry.status,entry.reports.length);
}
await fs.mkdir('research',{recursive:true});
await fs.writeFile('research/jse-annual-batch-01.json',JSON.stringify(output,null,2)+'\\n');
