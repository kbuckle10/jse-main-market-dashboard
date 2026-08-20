import fs from 'node:fs';
import { chromium } from 'playwright';

const DATA_FILE = 'data.json';
const LISTED_URL = 'https://www.jamstockex.com/listings/listed-companies/';
const BASE_URL = 'https://www.jamstockex.com';

function readData(){ return JSON.parse(fs.readFileSync(DATA_FILE,'utf8')); }
function writeData(data){ fs.writeFileSync(DATA_FILE, JSON.stringify(data,null,2)+'\n'); }
function norm(value){ return String(value??'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
function companyCore(name){ return norm(name).replace(/\b(limited|ltd|plc|company|co|group|jamaica|holdings|holding)\b/g,' ').replace(/\s+/g,' ').trim(); }
function words(value){ return companyCore(value).split(' ').filter(w=>w.length>=3); }
function tickerRegex(ticker){ return new RegExp(`(^|[^A-Z0-9])${String(ticker).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^A-Z0-9]|$)`,'i'); }
async function dismissOverlays(page){ for(const text of ['Accept','Accept All','I Agree','Agree','Got it','Close']){ const btn=page.getByRole('button',{name:new RegExp(`^${text}$`,'i')}); if(await btn.count().catch(()=>0)) await btn.first().click({timeout:1500}).catch(()=>{});} await page.keyboard.press('Escape').catch(()=>{}); }
async function loadListedPage(page){ for(let attempt=1;attempt<=3;attempt++){ try{ const response=await page.goto(LISTED_URL,{waitUntil:'domcontentloaded',timeout:45000}); console.log(`Listed companies navigation attempt ${attempt}: HTTP ${response?.status()??'unknown'}`); await page.waitForLoadState('load',{timeout:12000}).catch(()=>{}); await page.waitForTimeout(2500+attempt*500); await dismissOverlays(page); const body=await page.locator('body').innerText().catch(()=>''); if(body.length>500 && !/access denied|forbidden|just a moment|verify you are human/i.test(body)) return true; }catch(err){ console.warn(`Listed companies attempt ${attempt} failed: ${err.message}`);} if(attempt<3) await page.waitForTimeout(1500*attempt);} return false; }
async function extractInstrumentLinks(page){ return page.locator('a[href*="/trading/instruments/"][href*="instrument="]').evaluateAll(anchors=>anchors.map(a=>{ let container=a.closest('tr,li,article,.row,.company,.listing,.listed-company,.company-listing'); if(!container) container=a.parentElement?.parentElement||a.parentElement||a; return {href:a.href,text:(a.textContent||'').replace(/\s+/g,' ').trim(),context:(container?.textContent||'').replace(/\s+/g,' ').trim()}; })).catch(()=>[]); }
function scoreCandidate(stock,candidate){ const ticker=String(stock.ticker).toUpperCase(); const combined=norm(`${candidate.text} ${candidate.context}`); const anchor=norm(candidate.text); const core=companyCore(stock.company); let score=0; if(tickerRegex(ticker).test(candidate.text)) score+=140; else if(tickerRegex(ticker).test(candidate.context)) score+=110; if(core && anchor.includes(core)) score+=100; else if(core && combined.includes(core)) score+=80; for(const w of words(stock.company)){ if(anchor.includes(w)) score+=10; else if(combined.includes(w)) score+=5; } return score; }

const data=readData();
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1600,height:1100},locale:'en-US',timezoneId:'America/Jamaica',userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',extraHTTPHeaders:{'Accept-Language':'en-US,en;q=0.9'}});
const page=await context.newPage();
let links=[];
try{ if(await loadListedPage(page)){ links=await extractInstrumentLinks(page); console.log(`Captured ${links.length} JSE instrument link candidates.`); } } finally { await browser.close(); }

let matched=0,changed=0;
for(const stock of data.stocks){ const ranked=links.map(candidate=>({candidate,score:scoreCandidate(stock,candidate)})).sort((a,b)=>b.score-a.score); const best=ranked[0]; if(!best||best.score<20){ console.warn(`${stock.ticker}: no confident direct JSE instrument link found; preserving ${stock.jseUrl??'none'}`); continue; } const direct=new URL(best.candidate.href,BASE_URL).href; matched++; if(stock.jseUrl!==direct){ stock.jseUrl=direct; changed++; } console.log(`${stock.ticker}: ${direct} (score ${best.score})`); }
data.universeSource=LISTED_URL;
data.instrumentLinksUpdated=new Date().toISOString();
if(changed||matched) writeData(data);
console.log(`JSE direct links matched ${matched}/${data.stocks.length}; changed ${changed}.`);
if(!matched) process.exitCode=2;
