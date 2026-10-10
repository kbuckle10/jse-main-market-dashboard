(() => {
'use strict';
const select=document.getElementById('cashflowTicker'), chart=document.getElementById('cashflowChart'), table=document.getElementById('cashflowTable'), status=document.getElementById('cashflowStatus');
if(!select||!chart||!table)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Number(x).toLocaleString('en-US',{maximumFractionDigits:2});
fetch('cashflow-data.json?v=20261010-1',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{
 select.innerHTML=d.companies.map(c=>'<option value="'+esc(c.ticker)+'">'+esc(c.ticker)+'</option>').join('');
 function render(){
  const c=d.companies.find(x=>x.ticker===select.value);if(!c)return;
  const rows=[...c.periods].reverse();
  const max=Math.max(1,...rows.flatMap(x=>[Math.abs(x.operatingCashFlow),Math.abs(x.freeCashFlow)]));
  status.innerHTML='<p><strong>'+esc(c.currency)+' millions</strong> · <a href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">StockAnalysis cash-flow statement ↗</a> · JSE cross-check pending</p>'+(c.ticker==='CAR'?'<p>CAR changed its financial year-end; two FY2023 periods are distinguished by their dates.</p>':'')+(c.ticker==='NCBFG'?'<p>Financial-sector cash-flow interpretation differs from operating companies.</p>':'');
  chart.innerHTML='<div style="display:flex;gap:16px;margin:12px 0;color:#aabbd0"><span style="color:#22c55e">■ Operating cash flow</span><span style="color:#86efac">■ Free cash flow</span></div>'+rows.map(p=>{const w1=Math.max(1,Math.abs(p.operatingCashFlow)/max*100),w2=Math.max(1,Math.abs(p.freeCashFlow)/max*100);return '<div style="margin:12px 0"><div style="font-size:12px;margin-bottom:5px">'+esc(p.period)+' · '+esc(p.periodEnding)+'</div><div style="display:grid;gap:3px"><div title="Operating cash flow: '+fmt(p.operatingCashFlow)+'" style="height:11px;border-radius:4px;background:'+(p.operatingCashFlow<0?'#dc2626':'#16a34a')+';width:'+w1+'%"></div><div title="Free cash flow: '+fmt(p.freeCashFlow)+'" style="height:11px;border-radius:4px;background:'+(p.freeCashFlow<0?'#ef4444':'#86efac')+';width:'+w2+'%"></div></div></div>'}).join('');
  table.innerHTML='<table style="width:100%;margin-top:20px"><thead><tr><th>Period</th><th>Ending</th><th>Operating CF</th><th>CapEx</th><th>Free CF</th></tr></thead><tbody>'+c.periods.map(p=>'<tr><td>'+esc(p.period)+'</td><td>'+esc(p.periodEnding)+'</td><td>'+fmt(p.operatingCashFlow)+'</td><td>'+fmt(p.capitalExpenditures)+'</td><td>'+fmt(p.freeCashFlow)+'</td></tr>').join('')+'</tbody></table>';
 }
 select.addEventListener('change',render);render();
 document.addEventListener('click',event=>{const btn=event.target.closest?.('.cashflow-jump');if(!btn)return;const ticker=btn.dataset.cfTicker;if(!d.companies.some(c=>c.ticker===ticker)){status.textContent='Cash-flow history not yet available for '+ticker;document.querySelector('[data-tab="cashflow"]')?.click();return;}select.value=ticker;document.querySelector('[data-tab="cashflow"]')?.click();render();document.getElementById('tab-cashflow')?.scrollIntoView({behavior:'smooth',block:'start'});});
}).catch(e=>{status.textContent='Cash-flow data unavailable: '+e.message});
})();