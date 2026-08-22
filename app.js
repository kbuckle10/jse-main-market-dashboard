(() => {
'use strict';

let stocks = [];
let view = localStorage.getItem('jse-main-view') || 'table';
let activeTab = localStorage.getItem('jse-main-tab') || 'overview';
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v);
const fmt = (v,d=2) => num(v) == null ? 'N/A' : num(v).toFixed(d);
const unit = x => x?.currency === 'USD' ? 'US$' : 'J$';
const directJse = x => typeof x?.jseUrl === 'string' && /^https:\/\/www\.jamstockex\.com\/trading\/instruments\/\?instrument=\d+$/.test(x.jseUrl) ? x.jseUrl : null;
const saUrl = x => x?.saUrl || `https://stockanalysis.com/quote/${String(x?.saMarket || 'jmse').toLowerCase()}/${encodeURIComponent(x?.saTicker || x?.ticker || '')}/`;
const sourceName = (x,key,fallback='') => String(x?.[`${key}Source`] || fallback).toUpperCase();

function src(label,title,url){
  const cls = String(label).toLowerCase().replace(/\s+/g,'-');
  return url ? `<a class="src ${cls}" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(title)}">${esc(label)}</a>`
             : `<span class="src ${cls}" title="${esc(title)}">${esc(label)}</span>`;
}
function metricBadge(x,key){
  const fallback = ['eps','bvps','roe','epsGrowth'].includes(key) ? 'SA' : 'CALC';
  const s = sourceName(x,key,fallback);
  if (s.startsWith('SA')) return src(s.includes('TTSE') ? 'SA TTSE' : 'SA','Published by StockAnalysis',saUrl(x));
  if (s === 'JSE') return src('JSE','Official JSE value',directJse(x));
  if (s === 'CALC') return src('CALC','Calculated fallback');
  return s ? src(s,s) : '';
}
function statusText(x,key){
  const state = String(x?.metricStatus?.[key]?.state || '').toLowerCase();
  if (state === 'error') return '<span class="negative" title="Collector/source error">ERROR</span>';
  return 'N/A';
}
function tickerHtml(x){
  const u = directJse(x);
  return u ? `<a class="ticker" href="${u}" target="_blank" rel="noopener">${esc(x.ticker)} ↗</a>` : `<span class="ticker">${esc(x.ticker)}</span>`;
}
function ratingBadge(r){
  const v = r || 'WATCH';
  return `<span class="rating ${esc(v)}">${esc(v)}</span>`;
}
function scoreCell(x){
  return `<button type="button" class="score-detail-btn compact" data-score-ticker="${esc(x.ticker)}" aria-label="Open ${esc(x.ticker)} score details"><strong>${x.score ?? 'N/A'}</strong><span>/100</span><i>ⓘ</i></button>`;
}
function addRefreshPill(d){
  const raw = d.refreshedAt || d.saRatiosUpdated || d.crossListedPrimaryUpdated || d.saFundamentalsUpdated || d.saPerformanceUpdated;
  if (!raw || !$('updatedPill')) return;
  const dt = new Date(raw);
  if (Number.isNaN(dt.valueOf())) return;
  let p = $('refreshPill');
  if (!p) {
    p = document.createElement('span');
    p.id='refreshPill'; p.className='pill';
    $('updatedPill').insertAdjacentElement('afterend',p);
  }
  p.textContent = `Refreshed ${new Intl.DateTimeFormat('en-JM',{timeZone:'America/Jamaica',month:'short',day:'numeric',year:'numeric'}).format(dt)}`;
}
function filtered(){
  const q = String($('search')?.value || '').toLowerCase();
  const r = $('ratingFilter')?.value || '';
  const s = $('sectorFilter')?.value || '';
  const k = $('sortSelect')?.value || 'score';
  const a = stocks.filter(x => (!q || `${x.ticker} ${x.company}`.toLowerCase().includes(q)) && (!r || x.rating === r) && (!s || x.sector === s));
  a.sort((x,y) => k==='pb' ? (num(x.pb)??999)-(num(y.pb)??999)
    : k==='roe' ? (num(y.roe)??-999)-(num(x.roe)??-999)
    : k==='pe' ? (num(x.pe)??999)-(num(y.pe)??999)
    : k==='yield' ? (num(y.divYield)??-999)-(num(x.divYield)??-999)
    : (num(y.score)??-999)-(num(x.score)??-999));
  return a;
}
function row(x){
  const priceBadge = x.price == null ? '' : (String(x.priceSource || x.source || 'JSE').toUpperCase()==='JSE'
    ? src('JSE','Official JSE closing price',directJse(x))
    : src('SA','StockAnalysis price',saUrl(x)));
  return `<tr>
    <td>${tickerHtml(x)}</td>
    <td>${esc(x.company)} <a class="sa-link" href="${saUrl(x)}" target="_blank" rel="noopener">SA↗</a></td>
    <td>${esc(x.sector || 'N/A')}</td><td>${esc(x.ratingBasis || 'N/A')}</td>
    <td>${x.price==null?'N/A':unit(x)+fmt(x.price)+priceBadge}</td>
    <td>${x.eps==null?statusText(x,'eps'):fmt(x.eps)+metricBadge(x,'eps')}</td>
    <td>${x.pe==null?statusText(x,'pe'):fmt(x.pe)+metricBadge(x,'pe')}</td>
    <td>${x.pb==null?statusText(x,'pb'):fmt(x.pb)+metricBadge(x,'pb')}</td>
    <td class="${num(x.roe)!=null&&num(x.roe)>12?'positive':num(x.roe)!=null&&num(x.roe)<5?'negative':''}">${x.roe==null?statusText(x,'roe'):fmt(x.roe)+'%'+metricBadge(x,'roe')}</td>
    <td class="${num(x.epsGrowth)!=null&&num(x.epsGrowth)>0?'positive':num(x.epsGrowth)!=null&&num(x.epsGrowth)<0?'negative':''}">${x.epsGrowth==null?statusText(x,'epsGrowth'):fmt(x.epsGrowth)+'%'+metricBadge(x,'epsGrowth')}</td>
    <td>${x.divYield==null?statusText(x,'divYield'):fmt(x.divYield)+'%'+metricBadge(x,'divYield')}</td>
    <td>${esc(x.fairValue || 'N/A')}</td><td>${esc(x.buyZone || 'N/A')}</td><td>${scoreCell(x)}</td><td>${ratingBadge(x.rating)}</td>
  </tr>`;
}
function card(x){
  return `<article class="stock-card">
    <div class="stock-head"><div>${tickerHtml(x)}<div class="company">${esc(x.company)}</div></div><div class="price">${x.price==null?'N/A':unit(x)+fmt(x.price)}</div></div>
    <div class="basis">${esc(x.ratingBasis || 'N/A')} • ${esc(x.sector || 'N/A')}</div>
    <div class="metric-grid">
      <div class="metric"><span>EPS</span><strong>${x.eps==null?statusText(x,'eps'):fmt(x.eps)}</strong></div>
      <div class="metric"><span>P/E</span><strong>${x.pe==null?statusText(x,'pe'):fmt(x.pe)}</strong></div>
      <div class="metric"><span>P/B</span><strong>${x.pb==null?statusText(x,'pb'):fmt(x.pb)}</strong></div>
      <div class="metric"><span>ROE</span><strong>${x.roe==null?statusText(x,'roe'):fmt(x.roe)+'%'}</strong></div>
      <div class="metric"><span>EPS Growth</span><strong>${x.epsGrowth==null?statusText(x,'epsGrowth'):fmt(x.epsGrowth)+'%'}</strong></div>
      <div class="metric"><span>Yield</span><strong>${x.divYield==null?statusText(x,'divYield'):fmt(x.divYield)+'%'}</strong></div>
      <div class="metric"><span>Score</span>${scoreCell(x)}</div><div class="metric"><span>Rating</span><strong>${ratingBadge(x.rating)}</strong></div>
    </div>
    <div class="range-grid"><div class="range-box"><span>Fair Value</span><strong>${esc(x.fairValue||'N/A')}</strong></div><div class="range-box"><span>Buy Zone</span><strong>${esc(x.buyZone||'N/A')}</strong></div></div>
    <div class="card-footer"><div class="card-actions">${directJse(x)?`<a href="${directJse(x)}" target="_blank" rel="noopener">JSE ↗</a>`:''}<a href="${saUrl(x)}" target="_blank" rel="noopener">SA ↗</a></div>${ratingBadge(x.rating)}</div>
  </article>`;
}
function renderKpis(){
  const c={BUY:0,HOLD:0,WATCH:0,AVOID:0}; stocks.forEach(x=>{if(c[x.rating]!=null)c[x.rating]++});
  const active=$('ratingFilter')?.value || 'ALL';
  const specs=[['Universe',stocks.length,'ALL','universe'],['BUY',c.BUY,'BUY','buy'],['HOLD',c.HOLD,'HOLD','hold'],['WATCH',c.WATCH,'WATCH','watch'],['AVOID',c.AVOID,'AVOID','avoid']];
  const html=specs.map(v=>`<button class="kpi ${v[3]} ${active===v[2]?'active':''}" data-rating="${v[2]}"><span class="label">${v[0]}</span><span class="value">${v[1]}</span></button>`).join('');
  if($('kpis'))$('kpis').innerHTML=html; if($('kpisStocks'))$('kpisStocks').innerHTML=html;
  document.querySelectorAll('.kpi').forEach(b=>b.onclick=()=>{if($('ratingFilter'))$('ratingFilter').value=b.dataset.rating==='ALL'?'':b.dataset.rating;setTab('stocks');renderKpis();renderStocks();});
}
function setView(v){
  view=v; localStorage.setItem('jse-main-view',v);
  $('tableViewBtn')?.classList.toggle('active',v==='table'); $('cardViewBtn')?.classList.toggle('active',v==='cards');
  $('tableView')?.classList.toggle('hidden',v!=='table'); $('desktopCards')?.classList.toggle('hidden',v!=='cards');
}
function renderStocks(){
  const a=filtered();
  if($('stockRows'))$('stockRows').innerHTML=a.map(row).join('');
  if($('desktopCards'))$('desktopCards').innerHTML=a.map(card).join('');
  if($('mobileList'))$('mobileList').innerHTML=a.map(card).join('');
  setView(view);
}
function rankStocks(mode){
  const a=[...stocks];
  if(mode==='dividend')return a.filter(x=>num(x.divYield)!=null).sort((x,y)=>num(y.divYield)-num(x.divYield)).slice(0,10);
  if(mode==='growth')return a.filter(x=>num(x.epsGrowth)!=null).sort((x,y)=>num(y.epsGrowth)-num(x.epsGrowth)).slice(0,10);
  if(mode==='value')return a.filter(x=>num(x.pe)>0).sort((x,y)=>num(x.pe)-num(y.pe)).slice(0,10);
  return a.filter(x=>num(x.score)!=null).sort((x,y)=>num(y.score)-num(x.score)).slice(0,10);
}
function rankBlock(title,mode,sub){
  return `<article class="panel section-card"><p class="eyebrow">${esc(sub)}</p><h2>${esc(title)}</h2><div class="rank-list">${rankStocks(mode).map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-main"><strong>${esc(x.ticker)} • ${esc(x.company)}</strong><span>${esc(x.ratingBasis||x.sector||'')}</span></div><div class="rank-score">${mode==='dividend'?fmt(x.divYield)+'%':mode==='growth'?fmt(x.epsGrowth)+'%':mode==='value'?fmt(x.pe)+'×':x.score}</div></div>`).join('')}</div></article>`;
}
function renderRankings(){if($('rankingsGrid'))$('rankingsGrid').innerHTML=rankBlock('Top Overall','score','Opportunity score')+rankBlock('Dividend Opportunities','dividend','Income')+rankBlock('Growth Opportunities','growth','EPS growth')+rankBlock('Value Stocks','value','Low positive P/E');}
function renderOverview(){
  if(!$('overviewGrid'))return;
  const top=stocks.filter(x=>x.rating==='BUY').sort((a,b)=>(num(b.score)||0)-(num(a.score)||0)).slice(0,5);
  const avoid=stocks.filter(x=>x.rating==='AVOID').sort((a,b)=>(num(a.score)??999)-(num(b.score)??999)).slice(0,5);
  $('overviewGrid').innerHTML=`<article class="panel section-card"><p class="eyebrow">Current opportunities</p><h2>Highest-ranked BUYs</h2><div class="rank-list">${top.map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-main"><strong>${esc(x.ticker)} • ${esc(x.company)}</strong><span>${esc(x.ratingBasis||'')}</span></div><div class="rank-score">${x.score}/100</div></div>`).join('')}</div></article>
  <article class="panel section-card"><p class="eyebrow">Risk control</p><h2>Lowest-ranked AVOIDs</h2><div class="rank-list">${avoid.map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-main"><strong>${esc(x.ticker)} • ${esc(x.company)}</strong><span>${esc(x.ratingBasis||'')}</span></div><div class="rank-score">${x.score}/100</div></div>`).join('')}</div></article>
  <article class="panel section-card"><p class="eyebrow">Methodology</p><h2>Source hierarchy</h2><p class="section-copy">JSE close is authoritative for Jamaica-market price. Published StockAnalysis ratios/fundamentals are preferred. CALC is fallback only. Fair Value, Buy Zone, rating and score remain analyst-reviewed.</p></article>`;
}
function signalClass(kind,v,x){
  v=num(v); if(v==null)return'neutral';
  if(kind==='roe')return v>=15?'good':v>=8?'neutral':'bad';
  if(kind==='growth')return v>=10?'good':v>=0?'neutral':'bad';
  if(kind==='yield')return v>=4?'good':v>=2?'neutral':'warn';
  if(kind==='pe')return v>0&&v<=12?'good':v<=20?'neutral':'warn';
  if(kind==='pb'){const fin=/bank|financial|insurance|investment|real estate|fund/i.test(x.sector||'');return fin?(v<=1?'good':v<=1.5?'neutral':'warn'):(v<=2?'neutral':'warn');}
  return'neutral';
}
function caseCard(x){
  const m=[['P/E',x.pe,'pe',x.pe==null?statusText(x,'pe'):fmt(x.pe)+'×'],['P/B',x.pb,'pb',x.pb==null?statusText(x,'pb'):fmt(x.pb)+'×'],['ROE',x.roe,'roe',x.roe==null?statusText(x,'roe'):fmt(x.roe)+'%'],['EPS Growth',x.epsGrowth,'growth',x.epsGrowth==null?statusText(x,'epsGrowth'):fmt(x.epsGrowth)+'%'],['Yield',x.divYield,'yield',x.divYield==null?statusText(x,'divYield'):fmt(x.divYield)+'%']];
  return `<article class="panel case-card"><div class="case-head"><div>${tickerHtml(x)}<h3>${esc(x.company)}</h3><small>${esc(x.sector||'')}</small></div>${ratingBadge(x.rating)}</div><p class="case-thesis">${esc(x.ratingBasis||'No rating basis')}</p><div class="case-metrics">${m.map(v=>`<div class="case-metric ${signalClass(v[2],v[1],x)}"><span>${v[0]}</span><strong>${v[3]}</strong></div>`).join('')}</div><div class="case-footer"><span>Fair Value <strong>${esc(x.fairValue||'N/A')}</strong></span><span>Buy Zone <strong>${esc(x.buyZone||'N/A')}</strong></span><span>Score ${scoreCell(x)}</span></div></article>`;
}
function renderRatingCase(){
  if(!$('ratingCaseGrid'))return;
  const q=String($('caseSearch')?.value||'').toLowerCase(), r=$('caseRating')?.value||'';
  $('ratingCaseGrid').innerHTML=stocks.filter(x=>(!q||`${x.ticker} ${x.company}`.toLowerCase().includes(q))&&(!r||x.rating===r)).sort((a,b)=>(num(b.score)||0)-(num(a.score)||0)).map(caseCard).join('');
}
function portfolioCard(title,type,copy){
  let pool=stocks.filter(x=>x.rating==='BUY'||x.rating==='HOLD');
  pool.sort((a,b)=>type==='income'?(num(b.divYield)||0)-(num(a.divYield)||0):type==='growth'?(num(b.epsGrowth)??-999)-(num(a.epsGrowth)??-999):(num(b.score)||0)-(num(a.score)||0));
  pool=pool.slice(0,7);
  const raw=pool.map(x=>type==='income'?Math.max(1,num(x.divYield)||1):type==='growth'?Math.max(1,Math.min(30,(num(x.epsGrowth)||0)+10)):Math.max(1,num(x.score)||1));
  const total=raw.reduce((a,b)=>a+b,0)||1, arr=pool.map((x,i)=>({x,pct:Math.round(raw[i]/total*100)}));
  if(arr.length)arr[0].pct+=100-arr.reduce((s,o)=>s+o.pct,0);
  return `<article class="panel portfolio-card"><p class="eyebrow">Model portfolio</p><h3>${esc(title)}</h3><p class="section-copy">${esc(copy)}</p>${arr.map(o=>`<div class="alloc-row"><div><div class="alloc-label"><span>${esc(o.x.ticker)}</span><span>${ratingBadge(o.x.rating)}</span></div><div class="alloc-track"><div class="alloc-fill" style="width:${o.pct}%"></div></div></div><div class="alloc-pct">${o.pct}%</div></div>`).join('')}</article>`;
}
function renderPortfolios(){if($('portfolioGrid'))$('portfolioGrid').innerHTML=portfolioCard('Dividend / Income','income','Prioritizes stronger trailing yield while retaining BUY/HOLD discipline.')+portfolioCard('Growth & Appreciation','growth','Leans toward positive EPS growth opportunities.')+portfolioCard('Balanced Total Return','balanced','Uses the composite Opportunity Score as the primary allocation signal.');}
const glossary=[['EPS','Earnings Per Share','Net income attributable to ordinary shareholders ÷ weighted-average shares','Profit earned for each ordinary share.'],['EPS Growth','Earnings growth','(Current EPS ÷ prior EPS − 1) × 100','Shows how quickly EPS is growing or shrinking.'],['BVPS','Book Value Per Share','Common equity ÷ ordinary shares outstanding','Especially useful for banks, insurers and asset-heavy firms.'],['P/B','Price-to-Book','Published SA P/B preferred; otherwise JSE close ÷ BVPS','Read together with ROE.'],['P/E','Price-to-Earnings','Published SA P/E preferred; otherwise JSE close ÷ EPS','Compare with growth, quality, history and peers.'],['ROE','Return on Equity','Net income ÷ average common equity × 100','Measures profitability of shareholder capital.'],['Dividend Yield','Income yield','Published SA yield preferred; otherwise trailing DPS ÷ JSE close × 100','High yield alone is not sufficient.'],['Fair Value','Analyst valuation range','Sector-appropriate normalized valuation','Analyst-reviewed estimate.'],['Buy Zone','Margin-of-safety range','Fair value adjusted for required margin of safety','Target entry range.'],['Opportunity Score','Composite score','Valuation 25 + Quality 20 + Growth 20 + Financial Strength 15 + Dividend 10 + Momentum/Catalysts 10','Supports, but does not replace, the rating.']];
function renderGlossary(){if($('glossaryGrid'))$('glossaryGrid').innerHTML=glossary.map(g=>`<article class="panel glossary-card"><div class="term">${esc(g[0])}</div><h3>${esc(g[1])}</h3><div class="formula">${esc(g[2])}</div><p class="interpretation">${esc(g[3])}</p></article>`).join('');}
function renderAll(){renderKpis();renderOverview();renderStocks();renderRatingCase();renderRankings();renderPortfolios();renderGlossary();}
function setTab(name){
  const valid=['overview','stocks','ratingcase','rankings','portfolios','glossary']; if(!valid.includes(name))name='overview';
  activeTab=name; localStorage.setItem('jse-main-tab',name);
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));
}
function showLoadError(e){
  console.error(e);
  if($('subtitle'))$('subtitle').textContent='Unable to load dashboard data';
  if($('updatedPill'))$('updatedPill').textContent='DATA ERROR';
  if($('overviewGrid'))$('overviewGrid').innerHTML=`<article class="panel section-card"><p class="eyebrow">Data load error</p><h2>Dashboard data could not be loaded</h2><p class="section-copy">${esc(e?.message||String(e))}</p></article>`;
}

const SCORE_WEIGHTS=[['valuation','Valuation',25],['quality','Business Quality',20],['growth','Earnings / Growth',20],['financialStrength','Financial Strength',15],['dividend','Dividend Quality',10],['momentum','Momentum / Catalysts',10]];
function scoreComponents(x){
  const c=x.scoreComponents||x.scoreBreakdown||{}, out={};
  const aliases={valuation:['valuation','valuationScore'],quality:['quality','businessQuality','qualityScore'],growth:['growth','earningsGrowth','growthScore'],financialStrength:['financialStrength','financial','strength','financialStrengthScore'],dividend:['dividend','dividendQuality','dividendScore'],momentum:['momentum','momentumCatalysts','catalysts','momentumScore']};
  for(const [k,keys] of Object.entries(aliases)){for(const key of keys){const v=num(c[key]??x[key]);if(v!=null){out[k]=v;break;}}}
  return out;
}
function openScore(ticker){
  const x=stocks.find(s=>s.ticker===ticker); if(!x)return;
  let dlg=$('scoreDetails');
  if(!dlg){dlg=document.createElement('div');dlg.id='scoreDetails';dlg.className='score-overlay';dlg.innerHTML='<div class="score-sheet" role="dialog" aria-modal="true"><button class="score-close" aria-label="Close score details">×</button><div id="scoreBody"></div></div>';document.body.appendChild(dlg);dlg.addEventListener('click',e=>{if(e.target===dlg||e.target.closest('.score-close'))closeScore();});}
  const c=scoreComponents(x), complete=SCORE_WEIGHTS.every(([k])=>num(c[k])!=null), sum=SCORE_WEIGHTS.reduce((s,[k])=>s+(num(c[k])||0),0);
  const rows=SCORE_WEIGHTS.map(([k,label,max])=>{const v=num(c[k]);const pct=v==null?0:Math.max(0,Math.min(100,v/max*100));return `<div class="score-row"><div class="score-row-head"><div><strong>${label}</strong></div><b>${v==null?'—':v}<small>/${max}</small></b></div><div class="score-track"><div class="score-fill" style="width:${pct}%"></div></div></div>`}).join('');
  $('scoreBody').innerHTML=`<div class="score-top"><div><p>OPPORTUNITY SCORE</p><h2>${esc(x.ticker)} · ${esc(x.company)}</h2><small>${esc(x.ratingBasis||x.sector||'')}</small></div><div class="score-total"><strong>${x.score??'N/A'}</strong><span>/100</span></div></div><div class="score-evidence"><span>P/E <b>${x.pe==null?'N/A':fmt(x.pe)+'×'}</b></span><span>P/B <b>${x.pb==null?'N/A':fmt(x.pb)+'×'}</b></span><span>ROE <b>${x.roe==null?'N/A':fmt(x.roe)+'%'}</b></span><span>EPS Gr. <b>${x.epsGrowth==null?'N/A':fmt(x.epsGrowth)+'%'}</b></span><span>Yield <b>${x.divYield==null?'N/A':fmt(x.divYield)+'%'}</b></span></div><div class="score-rows">${rows}</div>${complete?`<div class="score-check ${Math.round(sum)===Math.round(num(x.score))?'ok':'warn'}"><strong>Component total: ${sum}/100</strong><span>${Math.round(sum)===Math.round(num(x.score))?'Matches the published Opportunity Score.':'Does not match the published total — analyst review required.'}</span></div>`:`<div class="score-check pending"><strong>Component breakdown pending analyst refresh</strong><span>Missing component scores are not reverse-engineered or invented.</span></div>`}`;
  dlg.classList.add('open'); document.body.classList.add('score-open');
}
function closeScore(){$('scoreDetails')?.classList.remove('open');document.body.classList.remove('score-open');}

async function load(){
  try{
    const res=await fetch(`data.json?v=${Date.now()}`,{cache:'no-store'});
    if(!res.ok)throw new Error(`data.json HTTP ${res.status}`);
    const d=await res.json();
    if(!Array.isArray(d.stocks)||!d.stocks.length)throw new Error('data.json stocks missing/empty');
    stocks=d.stocks;
    try{
      const rr=await fetch(`research.json?v=${Date.now()}`,{cache:'no-store'});
      if(rr.ok){
        const rd=await rr.json(), map=new Map((rd.stocks||[]).map(x=>[x.ticker,x]));
        stocks=stocks.map(x=>{const r=map.get(x.ticker);if(!r)return x;return {...r,...x,scoreComponents:x.scoreComponents??r.scoreComponents,scoreBreakdown:x.scoreBreakdown??r.scoreBreakdown};});
      }
    }catch(e){console.warn('research overlay unavailable',e);}
    const links=stocks.filter(directJse).length;
    if($('updatedPill'))$('updatedPill').textContent=d.asOf?`Market data ${d.asOf}`:'Latest available data';
    addRefreshPill(d);
    if($('subtitle'))$('subtitle').textContent=`${stocks.length} ordinary shares • ${links}/${stocks.length} direct JSE instrument links • valuation-aware research`;
    if($('sectorFilter')){const sectors=[...new Set(stocks.map(x=>x.sector).filter(Boolean))].sort();$('sectorFilter').innerHTML='<option value="">All sectors</option>'+sectors.map(s=>`<option>${esc(s)}</option>`).join('');}
    renderAll(); setTab(activeTab);
  }catch(e){showLoadError(e);}
}

document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
['search','ratingFilter','sectorFilter','sortSelect'].forEach(id=>$(id)?.addEventListener(id==='search'?'input':'change',()=>{renderKpis();renderStocks();}));
$('tableViewBtn')?.addEventListener('click',()=>setView('table')); $('cardViewBtn')?.addEventListener('click',()=>setView('cards'));
$('caseSearch')?.addEventListener('input',renderRatingCase); $('caseRating')?.addEventListener('change',renderRatingCase);
document.addEventListener('click',e=>{const b=e.target.closest('[data-score-ticker]');if(b){e.preventDefault();openScore(b.dataset.scoreTicker);}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeScore();});

load();
})();