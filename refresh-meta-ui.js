(()=>{
  const $=id=>document.getElementById(id);
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=(v,d=2)=>v==null||Number.isNaN(Number(v))?'N/A':Number(v).toFixed(d);
  const ratingBadge=r=>`<span class="rating ${esc(r||'WATCH')}">${esc(r||'WATCH')}</span>`;

  async function readData(){
    const r=await fetch(`data.json?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok) throw new Error(`data.json HTTP ${r.status}`);
    const d=await r.json();
    if(!Array.isArray(d.stocks)||!d.stocks.length) throw new Error('data.json stocks missing/empty');
    return d;
  }

  function addRefreshPill(d){
    const raw=d.refreshedAt||d.saRatiosUpdated||d.crossListedPrimaryUpdated||d.saFundamentalsUpdated||d.saPerformanceUpdated;
    const anchor=$('updatedPill');
    if(!anchor||!raw)return;
    const dt=new Date(raw); if(Number.isNaN(dt.valueOf()))return;
    let p=$('refreshPill');
    if(!p){p=document.createElement('span');p.id='refreshPill';p.className='pill';anchor.insertAdjacentElement('afterend',p)}
    p.textContent=`Refreshed ${new Intl.DateTimeFormat('en-JM',{timeZone:'America/Jamaica',month:'short',day:'numeric',year:'numeric'}).format(dt)}`;
  }

  function rescueRender(d){
    const s=d.stocks;
    const counts={BUY:0,HOLD:0,WATCH:0,AVOID:0};
    s.forEach(x=>{if(Object.prototype.hasOwnProperty.call(counts,x.rating))counts[x.rating]++});
    if($('subtitle')) $('subtitle').textContent=`${s.length} ordinary shares • recovered dashboard renderer • valuation-aware research`;
    if($('updatedPill')) $('updatedPill').textContent=d.asOf?`Market data ${d.asOf}`:'Latest available data';
    addRefreshPill(d);

    const k=`<button class="kpi universe"><span class="label">Universe</span><span class="value">${s.length}</span></button>`+
      ['BUY','HOLD','WATCH','AVOID'].map(r=>`<button class="kpi ${r.toLowerCase()}"><span class="label">${r}</span><span class="value">${counts[r]}</span></button>`).join('');
    if($('kpis')) $('kpis').innerHTML=k;
    if($('kpisStocks')) $('kpisStocks').innerHTML=k;

    const top=[...s].filter(x=>x.rating==='BUY').sort((a,b)=>(b.score||0)-(a.score||0)).slice(0,5);
    const avoid=[...s].filter(x=>x.rating==='AVOID').sort((a,b)=>(a.score||999)-(b.score||999)).slice(0,5);
    if($('overviewGrid')) $('overviewGrid').innerHTML=`<article class="panel section-card"><p class="eyebrow">Current opportunities</p><h2>Highest-ranked BUYs</h2><div class="rank-list">${top.map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-main"><strong>${esc(x.ticker)} • ${esc(x.company)}</strong><span>${esc(x.ratingBasis||'')}</span></div><div class="rank-score">${x.score??'N/A'}/100</div></div>`).join('')}</div></article><article class="panel section-card"><p class="eyebrow">Risk control</p><h2>Lowest-ranked AVOIDs</h2><div class="rank-list">${avoid.map((x,i)=>`<div class="rank-row"><div class="rank-no">${i+1}</div><div class="rank-main"><strong>${esc(x.ticker)} • ${esc(x.company)}</strong><span>${esc(x.ratingBasis||'')}</span></div><div class="rank-score">${x.score??'N/A'}/100</div></div>`).join('')}</div></article><article class="panel section-card"><p class="eyebrow">Recovery</p><h2>Dashboard data loaded</h2><p class="section-copy">The primary renderer did not initialize, so the self-healing renderer loaded the current data.json instead. Core stock data remains available while the deployment validation identifies the JavaScript issue.</p></article>`;

    const rows=s.map(x=>`<tr><td><a class="ticker" href="${esc(x.jseUrl||'#')}" target="_blank" rel="noopener">${esc(x.ticker)} ↗</a></td><td>${esc(x.company)}</td><td>${esc(x.sector||'N/A')}</td><td>${esc(x.ratingBasis||'N/A')}</td><td>${x.price==null?'N/A':'J$'+fmt(x.price)}</td><td>${fmt(x.eps)}</td><td>${fmt(x.pe)}</td><td>${fmt(x.pb)}</td><td>${x.roe==null?'N/A':fmt(x.roe)+'%'}</td><td>${x.epsGrowth==null?'N/A':fmt(x.epsGrowth)+'%'}</td><td>${x.divYield==null?'N/A':fmt(x.divYield)+'%'}</td><td>${esc(x.fairValue||'N/A')}</td><td>${esc(x.buyZone||'N/A')}</td><td>${x.score??'N/A'}/100</td><td>${ratingBadge(x.rating)}</td></tr>`).join('');
    if($('stockRows')) $('stockRows').innerHTML=rows;

    document.querySelectorAll('.tab-btn').forEach(b=>{b.onclick=()=>{document.querySelectorAll('.tab-btn').forEach(z=>z.classList.toggle('active',z===b));document.querySelectorAll('.tab-panel').forEach(p=>p.classList.toggle('active',p.id==='tab-'+b.dataset.tab));}});
  }

  async function init(){
    try{
      const d=await readData();
      addRefreshPill(d);
      setTimeout(()=>{
        const sub=$('subtitle');
        if(sub&&/Loading Main Market research/i.test(sub.textContent||'')){
          console.error('Primary dashboard renderer did not initialize; activating fallback renderer.');
          rescueRender(d);
        }
      },900);
    }catch(e){
      console.warn('refresh/fallback UI',e);
      const sub=$('subtitle'); if(sub&&/Loading Main Market research/i.test(sub.textContent||'')) sub.textContent=`Data load error: ${e.message}`;
    }
  }
  init();
})();