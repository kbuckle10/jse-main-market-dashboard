import fs from 'node:fs';
const stocks=JSON.parse(fs.readFileSync('data.json','utf8')).stocks.map(x=>x.ticker);
const done=new Set(JSON.parse(fs.readFileSync('cashflow-data.json','utf8')).companies.map(x=>x.ticker));
const inFlight=new Set(['SEP','KW','SJ','SGJ','CPJ']);
const next=stocks.filter(x=>!done.has(x)&&!inFlight.has(x)).slice(0,5);
fs.writeFileSync('research/next-sa-cashflow-tickers.txt',next.join(' '));
console.log('Remaining',stocks.filter(x=>!done.has(x)).length,'Next batch:',next.join(' '));
