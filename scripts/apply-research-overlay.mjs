import fs from 'node:fs';
const DATA='data.json', RESEARCH='research.json';
const data=JSON.parse(fs.readFileSync(DATA,'utf8'));
if(!fs.existsSync(RESEARCH)){console.log('No research.json overlay; nothing to merge.');process.exit(0);}
const research=JSON.parse(fs.readFileSync(RESEARCH,'utf8'));
const byTicker=new Map((research.stocks||[]).map(x=>[x.ticker,x]));
data.stocks=data.stocks.map(stock=>byTicker.has(stock.ticker)?{...stock,...byTicker.get(stock.ticker)}:stock);
data.researchAsOf=research.asOf||data.researchAsOf||null;
fs.writeFileSync(DATA,JSON.stringify(data,null,2)+'\n');
console.log(`Merged research overlay into ${data.stocks.length} Main Market rows.`);
