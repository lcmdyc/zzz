const KEY="zaozao_log_v2";
let log=JSON.parse(localStorage.getItem(KEY)||"[]");
let weekOff=0,lastAdded=null,toastTimer=null,charts={};
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hm=t=>{const d=new Date(t);return pad(d.getHours())+":"+pad(d.getMinutes())};
const md=t=>{const d=new Date(t);return `${d.getMonth()+1}月${d.getDate()}日 ${hm(t)}`};
const save=()=>{localStorage.setItem(KEY,JSON.stringify(log));sync();};
const sod=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
const dayLog=(id,d)=>log.filter(e=>e.a===id&&ymd(new Date(e.t))===ymd(d)).sort((x,y)=>x.t-y.t);

function fmtHM(ms){if(!ms||ms<0)return "0分";const m=Math.round(ms/60000),h=Math.floor(m/60);return h?`${h}时${pad(m%60)}分`:`${m}分`;}
function fmtHMS(ms){const s=Math.max(0,Math.floor(ms/1000));return `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`;}

/* ====== 通用出入计算（计时项使用） ====== */
function calc(oa,ia){
  const ev=log.filter(e=>e.a===oa||e.a===ia).sort((x,y)=>x.t-y.t);
  const out=[],gaps=[];let open=null,lastIn=null;
  ev.forEach(e=>{
    if(e.a===oa){if(open===null){if(lastIn!==null)gaps.push([lastIn,e.t]);open=e.t;lastIn=null;}}
    else{if(open!==null){out.push([open,e.t]);open=null;lastIn=e.t;}else if(lastIn===null)lastIn=e.t;}
  });
  return {out,gaps,open,lastIn};
}
const ov=(s,e,ds,de)=>Math.max(0,Math.min(e,de)-Math.max(s,ds));
function dayStats(c,date,now){
  const ds=sod(date),de=new Date(date.getFullYear(),date.getMonth(),date.getDate()+1).getTime();
  const outs=[...c.out];if(c.open!==null)outs.push([c.open,now]);
  let outMs=0,cnt=0;
  outs.forEach(([s,e])=>{outMs+=ov(s,e,ds,de);if(s>=ds&&s<de)cnt++;});
  const gs=c.gaps.filter(g=>g[1]>=ds&&g[1]<de).map(g=>g[1]-g[0]);
  return {outMs,cnt,gN:gs.length,gAvg:gs.length?gs.reduce((a,b)=>a+b,0)/gs.length:0,gMax:gs.length?Math.max(...gs):0};
}

/* ====== 数值合计 ====== */
const sumOf=(id,list)=>list.filter(e=>e.a===id).reduce((s,e)=>s+(parseFloat(e.v)||0),0);
const gramsOf=list=>sumOf("meal",list);

/* ====== 关联信息（只用于皂皂档案里 ctx:true 的状态项：大便/异常） ====== */
function ctxText(a,t){
  const p=[];
  const meals=log.filter(e=>e.a==="meal"&&e.t<=t).sort((x,y)=>y.t-x.t);
  p.push(meals[0]?`距上餐${fmtHM(t-meals[0].t)}(${meals[0].v||"?"}g)`:"无进食记录");
  const d24=log.filter(e=>e.t>t-864e5&&e.t<=t);
  p.push(`前24h喂食${gramsOf(d24)}g、零食${d24.filter(e=>e.a==="snack").length}次`);
  const nf=log.filter(e=>e.a==="newfood"&&e.t>t-3*864e5&&e.t<=t);
  if(nf.length)p.push("近3天新食物："+nf.map(e=>e.n).join("、"));
  if(Math.abs(Date.now()-t)<120000){
    const c=calc("crate_out","crate_in");
    if(c.open!==null)p.push(`正在笼外（已${fmtHM(t-c.open)}）`);
    else if(c.lastIn!==null)p.push(`进笼后${fmtHM(t-c.lastIn)}`);
  }
  return p.join("，");
}
