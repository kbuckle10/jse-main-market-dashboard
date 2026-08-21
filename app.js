let stocks = [];
let view = localStorage.getItem('jse-main-view') || 'table';
let activeTab = localStorage.getItem('jse-main-tab') || 'overview';

const $ = id => document.getElementById(id);
const fmt = (v, d = 2) => v == null || Number.isNaN(Number(v)) ? 'N/A' : Number(v).toFixed(d);
const unit = x => x.currency === 'USD' ? 'US$' : 'J$';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const directJse = x => typeof x?.jseUrl === 'string' && /^https:\/\/www\.jamstockex\.com\/trading\/instruments\/\?instrument=\d+$/.test(x.jseUrl) ? x.jseUrl : null;
const saUrl = x => x?.saUrl || `https://stockanalysis.com/quote/${(x?.saMarket || 'jmse').toLowerCase()}/${encodeURIComponent(x?.saTicker || x?.ticker || '')}/`;
const sourceName = (x, key, fallback) => String(x?.[`${key}Source`] || fallback || '').toUpperCase();
const src = (label, title, url) => url
  ? `<a class="src ${label.toLowerCase().replace(/\s+/g,'-')}" href="${url}" target="_blank" rel="noopener" title="${esc(title)}">${esc(label)}</a>`
  : `<span class="src ${label.toLowerCase().replace(/\s+/g,'-')}" title="${esc(title)}">${esc(label)}</span>`;

function metricBadge(x, key, calcTitle = 'Calculated fallback') {
  const s = sourceName(x, key, key === 'roe' || key === 'epsGrowth' || key === 'eps' || key === 'bvps' ? 'SA' : 'CALC');
  if (s.startsWith('SA')) return src(s.includes('TTSE') ? 'SA TTSE' : 'SA', `Published by StockAnalysis${s.includes('TTSE') ? ' TTSE' : ''}`, saUrl(x));
  if (s === 'JSE') return src('JSE', 'Official JSE value', directJse(x));
  if (s === 'CALC') return src('CALC', calcTitle);
  return s ? src(s, s) : '';
}

function tickerHtml(x) {
  const u = directJse(x);
  return u ? `<a class="ticker" href="${u}" target="_blank" rel="noopener">${esc(x.ticker)} ↗</a>` : `<span class="ticker">${esc(x.ticker)}</span>`;
}

function ratingBadge(r) {
  const v = r || 'WATCH';
  return `<span class="rating ${esc(v)}">${esc(v)}</span>`;
}

function scoreCell(x) {
  return `<button type="button" class="score-detail-btn compact" data-score-ticker="${esc(x.ticker)}"><strong>${x.score ?? 'N/A'}</strong><span>/100</span><i>ⓘ</i></button>`;
}

function statusText(x, key) {
  const s = x?.metricStatus?.[key]?.state;
  if (s === 'error') return '<span class="negative">ERROR</span>';
  return 'N/A';
}

function row(x) {
  const priceBadge = x.price == null ? '' : ((x.priceSource || x.source || 'JSE').toUpperCase() === 'JSE' ? src('JSE','Official JSE closing price',directJse(x)) : src('SA','Delayed StockAnalysis price',saUrl(x)));
  return `<tr><td>${tickerHtml(x)}</td><td>${esc(x.company)} <a class="sa-link" href="${saUrl(x)}" target="_blank" rel="noopener">SA↗</a></td><td>${esc(x.sector || 'N/A')}</td><td>${esc(x.ratingBasis || 'N/A')}</td><td>${x.price == null ? 'N/A' : unit(x)+fmt(x.price)+priceBadge}</td><td>${x.eps == null ? statusText(x,'eps') : fmt(x.eps)+metricBadge(x,'eps')}</td><td>${x.pe == null ? statusText(x,'pe') : fmt(x.pe)+metricBadge(x,'pe')}</td><td>${x.pb == null ? statusText(x,'pb') : fmt(x.pb)+metricBadge(x,'pb')}</td><td class="${x.roe > 12 ? 'positive' : x.roe != null && x.roe < 5 ? 'negative' : ''}">${x.roe == null ? statusText(x,'roe') : fmt(x.roe)+'%'+metricBadge(x,'roe')}</td><td class="${x.epsGrowth > 0 ? 'positive' : x.epsGrowth < 0 ? 'negative' : ''}">${x.epsGrowth == null ? statusText(x,'epsGrowth') : fmt(x.epsGrowth)+'%'+metricBadge(x,'epsGrowth')}</td><td>${x.divYield == null ? statusText(x,'divYield') : fmt(x.divYield)+'%'+metricBadge(x,'divYield')}</td><td>${esc(x.fairValue || 'N/A')}</td><td>${esc(x.buyZone || 'N/A')}</td><td>${scoreCell(x)}</td><td>${ratingBadge(x.rating)}</td></tr>`;
}

function card(x) {
  const priceBadge = x.price == null ? '' : ((x.priceSource || x.source || 'JSE').toUpperCase() === 'JSE' ? src('JSE','Official JSE closing price',directJse(x)) : src('SA','Delayed StockAnalysis price',saUrl(x)));
  return `<article class="stock-card"><div class="stock-head"><div style="min-width:0">${tickerHtml(x)}<div class="company">${esc(x.company)}</div></div><div><div class="price">${x.price==null?'N/A':unit(x)+fmt(x.price)}</div><div style="text-align:right">${priceBadge}</div></div></div><div class="basis">${esc(x.ratingBasis || 'N/A')} • ${esc(x.sector || 'N/A')}</div><div class="metric-grid"><div class="metric"><span>EPS</span><strong>${x.eps==null?statusText(x,'eps'):fmt(x.eps)}</strong></div><div class="metric"><span>P/E</span><strong>${x.pe==null?statusText(x,'pe'):fmt(x.pe)}</strong></div><div class="metric"><span>P/B</span><strong>${x.pb==null?statusText(x,'pb'):fmt(x.pb)}</strong></div><div class="metric"><span>ROE</span><strong class="${x.roe>12?'positive':x.roe!=null&&x.roe<5?'negative':''}">${x.roe==null?statusText(x,'roe'):fmt(x.roe)+'%'}</strong></div><div class="metric"><span>EPS Growth</span><strong class="${x.epsGrowth>0?'positive':x.epsGrowth<0?'negative':''}">${x.epsGrowth==null?statusText(x,'epsGrowth'):fmt(x.epsGrowth)+'%'}</strong></div><div class="metric"><span>Yield</span><strong>${x.divYield==null?statusText(x,'divYield'):fmt(x.divYield)+'%'}</strong></div><div class="metric"><span>Score</span>${scoreCell(x)}</div><div class="metric"><span>Rating</span><strong>${ratingBadge(x.rating)}</strong></div></div><div class="range-grid"><div class="range-box"><span>Fair Value</span><strong>${esc(x.fairValue||'N/A')}</strong></div><div class="range-box"><span>Buy Zone</span><strong>${esc(x.buyZone||'N/A')}</strong></div></div><div class="card-footer"><div class="card-actions">${directJse(x)?`<a href="${directJse(x)}" target="_blank" rel="noopener">JSE ↗</a>`:''}<a href="${saUrl(x)}" target="_blank" rel="noopener">SA ↗</a></div>${ratingBadge(x.rating)}</div></article>`;
}

function filtered() {
  const search = ($('search')?.value || '').toLowerCase();
  const rating = $('ratingFilter')?.value || '';
  const sector = $('sectorFilter')?.value || '';
  let a = stocks.filter(x => (!search || `${x.ticker} ${x.company}`.toLowerCase().includes(search)) && (!rating || x.rating === rating) && (!sector || x.sector === sector));
  const k = $('sortSelect')?.value || 'score';
  a.sort((x,y) => k==='pb' ? (x.pb??999)-(y.pb??999) : k==='roe' ? (y.roe??-999)-(x.roe??-999) : k==='pe' ? (x.pe??999)-(y.pe??999) : k==='yield' ? (y.divYield??-999)-(x.divYield??-999) : (y.score??-999)-(x.score??-999));
  return a;
}

function renderKpis() {
  const counts = {BUY:0,HOLD:0,WATCH:0,AVOID:0};
  for (const x of stocks) if (counts[x.rating] != null) counts[x.rating]++;
  const active = $('ratingFilter')?.value || 'ALL';
  const specs = [['Universe',stocks.length,'ALL','universe'],['BUY',counts.BUY,'BUY','buy'],['HOLD',counts.HOLD,'HOLD','hold'],['WATCH',counts.WATCH,'WATCH','watch'],['AVOID',counts.AVOID,'AVOID','avoid']];
  const html = specs.map(v=>`<button class="kpi ${v[3]} ${active===v[2]?'active':''}" data-rating="${v[2]}"><span class="label">${v[0]}</span><span class="value">${v[1]}</span></button>`).join('');
  if ($('kpis')) $('kpis').innerHTML = html;
  if ($('kpisStocks')) $('kpisStocks').innerHTML = html;
  document.querySelectorAll('.kpi').forEach(b => b.onclick = () => { if ($('ratingFilter')) $('ratingFilter').value = b.dataset.rating === 'ALL' ? '' : b.dataset.rating; setTab('stocks'); renderKpis(); renderStocks(); });
}

function renderStocks() {
  const a = filtered();
  if ($('stockRows')) $('stockRows').innerHTML = a.map(row).join('');
  if ($('desktopCards')) $('desktopCards').innerHTML = a.map(card).join('');
  if ($('mobileList')) $('mobileList').innerHTML = a.map(card).join('');
  setView(view);
}

function setView(v) {
  view = v; localStorage.setItem('jse-main-view',v);
  $('tableViewBtn')?.classList.toggle('active',v==='table');
  $('cardViewBtn')?.classList.toggle('active',v==='cards');
  $('tableView')?.classList.toggle('hidden',v!=='table');
  $('desktopCards')?.classList.toggle('hidden',v!=='cards');
}

function rankStocks(mode) {
  const a = [...stocks];
  if (mode==='dividend') return a.filter(x=>x.divYield!=null).sort((x,y)=>(y.divYield??-99)-(x.divYield??-99)).slice(0,10);
  if (mode==='growth') return a.filter(x=>x.epsGrowth!=null).sort((x,y)=>(y.epsGrowth??-999)-(x.epsGrowth??-999)).slice(0,10);
  if (mode==='value') return a.filter(x=>x.pe!=null&&x.pe>0).sort((x,y)=>x.pe-y.pe).slice(0,10);
  return a.filter(x=>x.score!=null).sort((x,y)=>(y.score??-999)-(x.score??-999)).slice(0,10);
}

function rankBlock(title, mode, sub) {
  return `<article class="panel section-card"><p class="eyebrow">${esc(sub)}</p><h2>${esc(title)}</h2><div class="rank-list">${rankStocks(mode).map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-main"><strong>${esc(x.ticker)} • ${esc(x.company)}</strong><span>${esc(x.ratingBasis||x.sector||'')}</span></div><div class="rank-score">${mode==='dividend'?fmt(x.divYield)+'%':mode==='growth'?fmt(x.epsGrowth)+'%':mode==='value'?fmt(x.pe)+'×':x.score}</div></div>`).join('')}</div></article>`;
}

function renderRankings() {
  if ($('rankingsGrid')) $('rankingsGrid').innerHTML = rankBlock('Top Overall','score','Opportunity score') + rankBlock('Dividend Opportunities','dividend','Income') + rankBlock('Growth Opportunities','growth','EPS growth') + rankBlock('Value Stocks','value','Low positive P/E');
}

function portfolioSet(type) {
  let pool = stocks.filter(x=>x.rating==='BUY'||x.rating==='HOLD');
  pool.sort((a,b)=>type==='income'?(b.divYield??-1)-(a.divYield??-1):type==='growth'?(b.epsGrowth??-999)-(a.epsGrowth??-999):(b.score??-999)-(a.score??-999));
  pool = pool.slice(0,7);
  const raw = pool.map(x=>type==='income'?Math.max(1,x.divYield||1):type==='growth'?Math.max(1,Math.min(30,(x.epsGrowth||0)+10)):Math.max(1,x.score||1));
  const total = raw.reduce((a,b)=>a+b,0)||1;
  const out = pool.map((x,i)=>({x,pct:Math.round(raw[i]/total*100)}));
  const diff = 100-out.reduce((s,o)=>s+o.pct,0); if (out[0]) out[0].pct += diff;
  return out;
}

function portfolioCard(title,type,copy) {
  return `<article class="panel portfolio-card"><p class="eyebrow">Model portfolio</p><h3>${esc(title)}</h3><p class="section-copy">${esc(copy)}</p>${portfolioSet(type).map(o=>`<div class="alloc-row"><div><div class="alloc-label"><span>${esc(o.x.ticker)}</span><span>${ratingBadge(o.x.rating)}</span></div><div class="alloc-track"><div class="alloc-fill" style="width:${o.pct}%"></div></div></div><div class="alloc-pct">${o.pct}%</div></div>`).join('')}</article>`;
}

function renderPortfolios() {
  if ($('portfolioGrid')) $('portfolioGrid').innerHTML = portfolioCard('Dividend / Income','income','Prioritizes stronger trailing yield while retaining BUY/HOLD discipline.') + portfolioCard('Growth & Appreciation','growth','Leans toward positive EPS-growth opportunities, capped to reduce concentration.') + portfolioCard('Balanced Total Return','balanced','Uses the composite Opportunity Score as the primary allocation signal.');
}

const glossary = [
 ['EPS','Earnings Per Share','Net income attributable to ordinary shareholders ÷ weighted-average ordinary shares','Profit earned for each ordinary share. Trend and earnings quality matter.'],
 ['EPS Growth','Earnings growth','(Current EPS ÷ Prior comparable EPS − 1) × 100','Shows how quickly earnings per share are growing or shrinking.'],
 ['BVPS','Book Value Per Share','Common equity attributable to ordinary shareholders ÷ ordinary shares outstanding','Especially useful for banks, insurers and asset-heavy companies.'],
 ['P/B','Price-to-Book','Published StockAnalysis P/B preferred; otherwise JSE close ÷ BVPS','Read together with ROE. Low P/B plus weak ROE can be a value trap.'],
 ['P/E','Price-to-Earnings','Published StockAnalysis P/E preferred; otherwise JSE close ÷ EPS','Compare with growth, quality, history and peers.'],
 ['ROE','Return on Equity','Net income ÷ average common shareholders’ equity × 100','For financial companies, interpret together with P/B and capital strength.'],
 ['Dividend Yield','Income yield','Published StockAnalysis yield preferred; otherwise trailing DPS ÷ JSE close × 100','High yield is not automatically attractive if coverage is weak.'],
 ['Earnings Yield','Inverse P/E','EPS ÷ share price × 100','Earnings generated for each dollar invested.'],
 ['Fair Value','Analyst valuation range','Sector-appropriate normalized valuation methods','Analyst-reviewed rather than mechanically scraped.'],
 ['Buy Zone','Margin-of-safety range','Fair value adjusted for required margin of safety','Target range for attractive new-money entry.'],
 ['Opportunity Score','Composite score','Valuation 25 + Quality 20 + Growth 20 + Financial Strength 15 + Dividend 10 + Momentum/Catalysts 10','The score supports, but does not replace, the valuation-aware rating.'],
 ['CALC','Calculated fallback','Used only when a published source ratio is unavailable','SA-published ratios take precedence over dashboard arithmetic.']
];

function renderGlossary() {
  if ($('glossaryGrid')) $('glossaryGrid').innerHTML = glossary.map(g=>`<article class="panel glossary-card"><div class="term">${esc(g[0])}</div><h3>${esc(g[1])}</h3><div class="formula">${esc(g[2])}</div><p class="interpretation">${esc(g[3])}</p></article>`).join('');
}

function signalClass(kind,v,x) {
  if (v == null) return 'neutral';
  if (kind==='roe') return v>=15?'good':v>=8?'neutral':'bad';
  if (kind==='growth') return v>=10?'good':v>=0?'neutral':'bad';
  if (kind==='yield') return v>=4?'good':v>=2?'neutral':'warn';
  if (kind==='pe') return v>0&&v<=12?'good':v<=20?'neutral':'warn';
  if (kind==='pb') { const financial=/bank|financial|insurance|investment|real estate|fund/i.test(x.sector||''); return financial ? (v<=1?'good':v<=1.5?'neutral':'warn') : (v<=2?'neutral':'warn'); }
  return 'neutral';
}

function caseCard(x) {
  const metrics = [['P/E',x.pe,'pe',x.pe==null?statusText(x,'pe'):fmt(x.pe)+'×'],['P/B',x.pb,'pb',x.pb==null?statusText(x,'pb'):fmt(x.pb)+'×'],['ROE',x.roe,'roe',x.roe==null?statusText(x,'roe'):fmt(x.roe)+'%'],['EPS Growth',x.epsGrowth,'growth',x.epsGrowth==null?statusText(x,'epsGrowth'):fmt(x.epsGrowth)+'%'],['Yield',x.divYield,'yield',x.divYield==null?statusText(x,'divYield'):fmt(x.divYield)+'%']];
  return `<article class="panel case-card"><div class="case-head"><div>${tickerHtml(x)}<h3>${esc(x.company)}</h3><small>${esc(x.sector||'')}</small></div>${ratingBadge(x.rating)}</div><p class="case-thesis">${esc(x.ratingBasis||'No rating basis available')}</p><div class="case-metrics">${metrics.map(m=>`<div class="case-metric ${signalClass(m[2],m[1],x)}"><span>${m[0]}</span><strong>${m[3]}</strong></div>`).join('')}</div><div class="case-footer"><span>Fair Value <strong>${esc(x.fairValue||'N/A')}</strong></span><span>Buy Zone <strong>${esc(x.buyZone||'N/A')}</strong></span><span>Score <strong>${x.score??'N/A'}/100</strong></span></div></article>`;
}

function renderRatingCase() {
  if (!$('ratingCaseGrid')) return;
  const q = ($('caseSearch')?.value||'').toLowerCase();
  const r = $('caseRating')?.value||'';
  $('ratingCaseGrid').innerHTML = stocks.filter(x=>(!q||`${x.ticker} ${x.company}`.toLowerCase().includes(q))&&(!r||x.rating===r)).sort((a,b)=>(b.score??-999)-(a.score??-999)).map(caseCard).join('');
}

function renderOverview() {
  if (!$('overviewGrid')) return;
  const top = [...stocks].filter(x=>x.rating==='BUY').sort((a,b)=>(b.score??-999)-(a.score??-999)).slice(0,5);
  const avoid = [...stocks].filter(x=>x.rating==='AVOID').sort((a,b)=>(a.score??999)-(b.score??999)).slice(0,5);
  $('overviewGrid').innerHTML = `<article class="panel section-card"><p class="eyebrow">Current opportunities</p><h2>Highest-ranked BUYs</h2><div class="rank-list">${top.map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-main"><strong>${esc(x.ticker)} • ${esc(x.company)}</strong><span>${esc(x.ratingBasis||'')}</span></div><div class="rank-score">${x.score}/100</div></div>`).join('')}</div></article><article class="panel section-card"><p class="eyebrow">Risk control</p><h2>Lowest-ranked AVOIDs</h2><div class="rank-list">${avoid.map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-main"><strong>${esc(x.ticker)} • ${esc(x.company)}</strong><span>${esc(x.ratingBasis||'')}</span></div><div class="rank-score">${x.score}/100</div></div>`).join('')}</div></article><article class="panel section-card"><p class="eyebrow">Methodology</p><h2>Source hierarchy</h2><p class="section-copy">Official JSE close is authoritative for Jamaica-market price. StockAnalysis-published ratios and fundamentals are preferred where available. CALC is a fallback only. Fair Value, Buy Zone, rating and score remain analyst-reviewed.</p></article>`;
}

function renderAll() { renderKpis(); renderOverview(); renderStocks(); renderRatingCase(); renderRankings(); renderPortfolios(); renderGlossary(); }

function setTab(name) {
  const valid = ['overview','stocks','ratingcase','rankings','portfolios','glossary'];
  if (!valid.includes(name)) name = 'overview';
  activeTab = name; localStorage.setItem('jse-main-tab',name);
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id===`tab-${name}`));
}

function showLoadError(err) {
  console.error('Dashboard load failed',err);
  if ($('subtitle')) $('subtitle').textContent = 'Unable to load dashboard data';
  if ($('updatedPill')) $('updatedPill').textContent = 'DATA ERROR';
  if ($('overviewGrid')) $('overviewGrid').innerHTML = `<article class="panel section-card"><p class="eyebrow">Data load error</p><h2>Dashboard data could not be loaded</h2><p class="section-copy">${esc(err?.message || String(err))}. Refresh the page; if this persists, the data/deployment pipeline requires review.</p></article>`;
}

async function load() {
  try {
    const res = await fetch(`data.json?v=${Date.now()}`,{cache:'no-store'});
    if (!res.ok) throw new Error(`data.json HTTP ${res.status}`);
    const d = await res.json();
    if (!Array.isArray(d.stocks)) throw new Error('data.json does not contain a stocks array');
    let base = d.stocks;
    try {
      const rr = await fetch(`research.json?v=${Date.now()}`,{cache:'no-store'});
      if (rr.ok) {
        const rd = await rr.json();
        const m = new Map((rd.stocks||[]).map(x=>[x.ticker,x]));
        base = base.map(x => m.has(x.ticker) ? {...m.get(x.ticker),...x, scoreComponents:x.scoreComponents??m.get(x.ticker).scoreComponents, scoreBreakdown:x.scoreBreakdown??m.get(x.ticker).scoreBreakdown} : x);
      }
    } catch (e) { console.warn('research overlay unavailable',e); }
    stocks = base;
    const jseLinks = stocks.filter(directJse).length;
    const asOf = d.asOf || d.jseTradeDate || '';
    if ($('updatedPill')) $('updatedPill').textContent = asOf ? `Market data ${asOf}` : 'Latest available data';
    if ($('subtitle')) $('subtitle').textContent = `${stocks.length} ordinary shares • ${jseLinks}/${stocks.length} direct JSE instrument links • valuation-aware research`;
    if ($('sectorFilter')) { $('sectorFilter').innerHTML = '<option value="">All sectors</option>'; [...new Set(stocks.map(x=>x.sector).filter(Boolean))].sort().forEach(s=>$('sectorFilter').insertAdjacentHTML('beforeend',`<option>${esc(s)}</option>`)); }
    renderAll(); setTab(activeTab);
  } catch (e) { showLoadError(e); }
}

document.querySelectorAll('.tab-btn').forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
['search','ratingFilter','sectorFilter','sortSelect'].forEach(id=>$(id)?.addEventListener(id==='search'?'input':'change',()=>{renderKpis();renderStocks()}));
$('tableViewBtn')?.addEventListener('click',()=>setView('table'));
$('cardViewBtn')?.addEventListener('click',()=>setView('cards'));
$('caseSearch')?.addEventListener('input',renderRatingCase);
$('caseRating')?.addEventListener('change',renderRatingCase);

load();
