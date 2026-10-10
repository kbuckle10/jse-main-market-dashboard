(() => {
'use strict';
const select=document.getElementById('cashflowTicker'), chart=document.getElementById('cashflowChart'), table=document.getElementById('cashflowTable'), status=document.getElementById('cashflowStatus');
if(!select||!chart||!table)return;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>x==null?'N/A':Number(x).toLocaleString('en-US',{maximumFractionDigits:2});
fetch('cashflow-data.json?v=20261010-1',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(d=>{
 select.innerHTML=d.companies.map(c=>'<option value="'+esc(c.ticker)+'">'+esc(c.ticker)+'</option>').join('');
 function render(){
  const c=d.companies.find(x=>x.ticker===select.value);if(!c)return;
  const rows=[...c.periods].reverse();
  const flexible=c.periods.some(p=>p.method==='operating_and_investing_disclosed'||p.method==='real_estate_operating_and_investing');
  const realEstate=c.periods.some(p=>p.realEstateAcquisitions!=null);
  const secondKey=flexible?(c.periods.some(p=>p.investingCashFlow!=null)?'investingCashFlow':c.periods.some(p=>p.leveredFreeCashFlow!=null)?'leveredFreeCashFlow':c.periods.some(p=>p.unleveredFreeCashFlow!=null)?'unleveredFreeCashFlow':'freeCashFlow'):'freeCashFlow';
  const secondLabel=({investingCashFlow:'Investing cash flow',leveredFreeCashFlow:'Levered FCF',unleveredFreeCashFlow:'Unlevered FCF',freeCashFlow:'Free cash flow'})[secondKey];
  const max=Math.max(1,...rows.flatMap(x=>[Math.abs(x.operatingCashFlow),Math.abs(x[secondKey]??0)]));
  status.innerHTML='<p><strong>'+esc(c.currency)+' millions</strong> · <a href="'+esc(c.url)+'" target="_blank" rel="noopener noreferrer">StockAnalysis cash-flow statement ↗</a> · JSE cross-check pending</p>'+(realEstate?'<p><strong>Real-estate reporting:</strong> property acquisitions and investing cash flows are shown separately. Conventional FCF is not inferred from property purchases. Review FFO/AFFO in company reports where available.</p>':flexible?'<p><strong>Alternative disclosure:</strong> displayed metrics are separately reported; conventional FCF is not inferred.</p>':'')+(c.ticker==='CAR'?'<p>CAR changed its financial year-end; two FY2023 periods are distinguished by their dates.</p>':'')+(c.ticker==='NCBFG'?'<p>Financial-sector cash-flow interpretation differs from operating companies.</p>':'');
  chart.innerHTML='<div style="display:flex;gap:16px;margin:12px 0;color:#aabbd0"><span style="color:#22c55e">■ Operating cash flow</span><span style="color:#86efac">■ '+secondLabel+'</span></div>'+rows.map(p=>{const w1=Math.max(1,Math.abs(p.operatingCashFlow)/max*100),w2=Math.max(1,Math.abs(p[secondKey]??0)/max*100);return '<div style="margin:12px 0"><div style="font-size:12px;margin-bottom:5px">'+esc(p.period)+' · '+esc(p.periodEnding)+'</div><div style="display:grid;gap:3px"><div title="Operating cash flow: '+fmt(p.operatingCashFlow)+'" style="height:11px;border-radius:4px;background:'+(p.operatingCashFlow<0?'#dc2626':'#16a34a')+';width:'+w1+'%"></div><div title="'+esc(secondLabel)+': '+fmt(p[secondKey])+'" style="height:11px;border-radius:4px;background:'+((p[secondKey]??0)<0?'#ef4444':'#86efac')+';width:'+w2+'%"></div></div></div>'}).join('');
  table.innerHTML='<table style="width:100%;margin-top:20px"><thead><tr><th>Period</th><th>Ending</th><th>Operating CF</th><th>'+(realEstate?'Property acquisitions':flexible?'Levered FCF':'CapEx')+'</th><th>'+esc(secondLabel)+'</th></tr></thead><tbody>'+c.periods.map(p=>'<tr><td>'+esc(p.period)+'</td><td>'+esc(p.periodEnding)+'</td><td>'+fmt(p.operatingCashFlow)+'</td><td>'+fmt(realEstate?p.realEstateAcquisitions:flexible?p.leveredFreeCashFlow:p.capitalExpenditures)+'</td><td>'+fmt(p.freeCashFlow)+'</td></tr>').join('')+'</tbody></table>';
 }
 select.addEventListener('change',render);render();
 document.addEventListener('click',event=>{const btn=event.target.closest?.('.cashflow-jump');if(!btn)return;const ticker=btn.dataset.cfTicker;if(!d.companies.some(c=>c.ticker===ticker)){status.textContent='Cash-flow history not yet available for '+ticker;document.querySelector('[data-tab="cashflow"]')?.click();return;}select.value=ticker;document.querySelector('[data-tab="cashflow"]')?.click();render();document.getElementById('tab-cashflow')?.scrollIntoView({behavior:'smooth',block:'start'});});
}).catch(e=>{status.textContent='Cash-flow data unavailable: '+e.message});
})();