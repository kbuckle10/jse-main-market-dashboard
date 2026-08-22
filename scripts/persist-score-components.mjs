import fs from 'node:fs';
const n=v=>v==null||v===''||Number.isNaN(Number(v))?null:Number(v);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const isFin=x=>/bank|financial|insurance|investment|real estate|fund/i.test(String(x.sector||''));
const ratioScore=(v,bands)=>{v=n(v);if(v==null)return .5;for(const [limit,score] of bands)if(v<=limit)return score;return bands[bands.length-1][1];};
function rangeNums(s){const a=String(s||'').replace(/,/g,'').match(/\d+(?:\.\d+)?/g);return a?a.map(Number):[]}
function valuation(x){const fin=isFin(x),pe=ratioScore(x.pe,[[8,1],[12,.9],[18,.7],[25,.45],[1e9,.2]]),pb=ratioScore(x.pb,fin?[[.7,1],[1,.9],[1.5,.68],[2,.45],[1e9,.2]]:[[1,1],[2,.78],[3,.52],[5,.3],[1e9,.15]]);const fv=rangeNums(x.fairValue),bz=rangeNums(x.buyZone),p=n(x.price);let margin=.5;if(p!=null&&bz.length){margin=p<=bz[bz.length-1]?1:.65}else if(p!=null&&fv.length){margin=p<fv[0]?.85:p<=fv[fv.length-1]?.6:.25}const ratio=fin?(pb*.6+pe*.4):(pe*.6+pb*.4);return clamp(Math.round((ratio*.62+margin*.38)*25),0,25)}
function quality(x){const m=x.saAnalystMetrics||{},roe=n(x.roe),roic=n(m.roic),margin=n(m.netMargin),fin=isFin(x);const rs=roe==null?.5:fin?clamp(roe/16,0,1):clamp(roe/20,0,1),is=roic==null?.5:clamp(roic/15,0,1),ms=margin==null?.5:clamp((margin+2)/20,0,1);return clamp(Math.round((rs*.65+is*.2+ms*.15)*20),0,20)}
function growth(x){const g=n(x.epsGrowth),m=x.saAnalystMetrics||{},margin=n(m.operatingMargin),gs=g==null?.45:g>=25?1:g>=10?.85:g>=0?.65:g>=-10?.45:g>=-30?.25:.08,ms=margin==null?.5:margin>=20?1:margin>=10?.8:margin>=5?.6:margin>=0?.4:.15;return clamp(Math.round((gs*.82+ms*.18)*20),0,20)}
function strength(x){const m=x.saAnalystMetrics||{},fin=isFin(x);if(fin){const roe=n(x.roe),roa=n(m.roa),nm=n(m.netMargin),a=roe==null?.5:clamp(roe/15,0,1),b=roa==null?.5:clamp(roa/2,0,1),c=nm==null?.5:clamp(nm/18,0,1);return clamp(Math.round((a*.45+b*.25+c*.3)*15),0,15)}const cr=n(m.currentRatio),de=n(m.debtEquity),ic=n(m.interestCoverage),a=cr==null?.5:cr>=2?1:cr>=1.5?.85:cr>=1?.6:.25,b=de==null?.5:de<=.3?1:de<=.7?.8:de<=1.2?.55:.25,c=ic==null?.5:ic>=6?1:ic>=3?.8:ic>=1.5?.55:.2;return clamp(Math.round((a*.34+b*.33+c*.33)*15),0,15)}
const dividend=x=>{const y=n(x.divYield);return y==null?5:y>=6?10:y>=4?8:y>=2?6:y>0?4:1};
function momentum(x){const vals=[[x.w1,.2],[x.m1,.3],[x.m3,.5]];let sum=0,w=0;for(const [v,wt] of vals){const z=n(v);if(z==null)continue;sum+=clamp((z+10)/20,0,1)*wt;w+=wt}return Math.round((w?sum/w:.5)*10)}
const MAX={valuation:25,quality:20,growth:20,financialStrength:15,dividend:10,momentum:10};
function calibrate(base,target){target=n(target);if(target==null)return base;target=clamp(Math.round(target),0,100);let out={...base},sum=Object.values(out).reduce((a,b)=>a+b,0);if(!sum)return out;const factor=target/sum;for(const k of Object.keys(out))out[k]=clamp(Math.round(out[k]*factor),0,MAX[k]);sum=Object.values(out).reduce((a,b)=>a+b,0);let diff=target-sum,guard=0;while(diff!==0&&guard++<300){const keys=Object.keys(out).sort((a,b)=>diff>0?(MAX[b]-out[b])-(MAX[a]-out[a]):out[b]-out[a]);let moved=false;for(const k of keys){if(diff>0&&out[k]<MAX[k]){out[k]++;diff--;moved=true}else if(diff<0&&out[k]>0){out[k]--;diff++;moved=true}if(diff===0)break}if(!moved)break}return out}
const d=JSON.parse(fs.readFileSync('data.json','utf8'));
let derived=0,explicit=0;
for(const x of d.stocks||[]){if(x.scoreComponents&&Object.keys(x.scoreComponents).length>=6){explicit++;continue}const base={valuation:valuation(x),quality:quality(x),growth:growth(x),financialStrength:strength(x),dividend:dividend(x),momentum:momentum(x)};x.scoreComponents=calibrate(base,x.score);x.scoreComponentMethod='metric-calibrated-v1';derived++;}
d.scoreComponentsUpdated=new Date().toISOString();
fs.writeFileSync('data.json',JSON.stringify(d,null,2)+'\n');
console.log(`scoreComponents: explicit=${explicit} derived=${derived} total=${(d.stocks||[]).length}`);
for(const x of d.stocks||[]){const c=x.scoreComponents||{};const sum=(c.valuation||0)+(c.quality||0)+(c.growth||0)+(c.financialStrength||0)+(c.dividend||0)+(c.momentum||0);if(sum!==Math.round(Number(x.score))) throw new Error(`${x.ticker}: components ${sum} != score ${x.score}`)}
