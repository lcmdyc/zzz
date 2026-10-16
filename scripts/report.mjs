const {SUPABASE_URL,SUPABASE_KEY,SB_EMAIL,SB_PASSWORD,RESEND_KEY,MAIL_TO,FORCE}=process.env;
for(const [k,v] of Object.entries({SUPABASE_URL,SUPABASE_KEY,SB_EMAIL,SB_PASSWORD,RESEND_KEY,MAIL_TO})){
  if(!v){console.error("缺少 Secret："+k);process.exit(1);}
}

/* ====== 阈值（网页里的设置存在手机浏览器中，这里单独写一份，要改就改这里）====== */
const GOAL_H=4, GREEN_H=3, RED_H=6;
const REM=[{id:"inner",label:"内驱",d:90},{id:"outer",label:"外驱",d:30},{id:"vacc",label:"疫苗",d:365}];

/* ====== 工具 ====== */
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hm=t=>{const d=new Date(t);return pad(d.getHours())+":"+pad(d.getMinutes())};
const md=t=>{const d=new Date(t);return `${d.getMonth()+1}月${d.getDate()}日 ${hm(t)}`};
const sod=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
const fmtHM=ms=>{if(!ms||ms<0)return "0分";const m=Math.round(ms/60000),h=Math.floor(m/60);return h?`${h}时${pad(m%60)}分`:`${m}分`;};
const goalMs=GOAL_H*36e5;
const gcls=ms=>ms<=GREEN_H*36e5?"gk":(ms>=RED_H*36e5?"gb":"gm");
const gramsOf=l=>l.filter(e=>e.a==="meal").reduce((s,e)=>s+(parseFloat(e.v)||0),0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

/* ====== 读取 Supabase 数据 ====== */
async function loadLogs(){
  const lr=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password",{method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email:SB_EMAIL,password:SB_PASSWORD})});
  const lj=await lr.json();
  if(!lr.ok)throw new Error("Supabase 登录失败："+(lj.error_description||lj.msg||lr.status));
  const all=[];let from=0;
  while(true){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/logs?select=id,a,t,v,n&order=t.asc,id.asc`,
      {headers:{apikey:SUPABASE_KEY,Authorization:"Bearer "+lj.access_token,Range:`${from}-${from+999}`}});
    if(!r.ok)throw new Error("读取数据失败 "+r.status+" "+(await r.text()).slice(0,100));
    const rows=await r.json();all.push(...rows);
    if(rows.length<1000)break;from+=1000;
  }
  return all.map(e=>({...e,t:Number(e.t),v:e.v||"",n:e.n||""}));
}

let log=[];

/* ====== 出入计算（与网页一致）====== */
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
  return {outMs,cnt};
}
function remStatus(r,asOf){
  const mine=log.filter(e=>e.a===r.id&&e.t<asOf);
  if(!mine.length)return {last:null};
  const last=mine.reduce((x,y)=>y.t>x.t?y:x);
  const due=new Date(sod(new Date(last.t))+r.d*864e5);
  const left=Math.round((sod(due)-sod(new Date(asOf)))/864e5);
  return {last,due,left};
}

/* ====== 生成报告 ====== */
function periodReport(s,e,title){
  const sm=s.getTime(),em=e.getTime(),now=Date.now();
  const L2=log.filter(x=>x.t>=sm&&x.t<em);
  const days=[];
  for(let d=new Date(s);d<e;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1))days.push(d);
  const act=new Set(L2.map(x=>ymd(new Date(x.t))));
  const ad=days.filter(d=>act.has(ymd(d)));
  const lines=[`# ${title}`,`周期：${ymd(s)} ~ ${ymd(new Date(em-1))}`,`有记录的天数：${ad.length} / ${days.length}`,""];
  if(!ad.length){lines.push("该期间没有记录。");return lines.join("\n");}
  const c=calc("crate_out","crate_in"),w=calc("walk_out","walk_in");
  const st=ad.map(d=>dayStats(c,d,now)),ws=ad.map(d=>dayStats(w,d,now));
  const sum=a=>a.reduce((x,y)=>x+y,0);
  const outT=sum(st.map(x=>x.outMs));
  const gp=c.gaps.filter(x=>x[1]>=sm&&x[1]<em).map(x=>x[1]-x[0]);
  lines.push("## 🏠 笼子");
  lines.push(`- 日均出笼：${fmtHM(outT/ad.length)}（目标 ${fmtHM(goalMs)}，达标 ${st.filter(x=>x.outMs>=goalMs).length}/${ad.length} 天）`);
  lines.push(`- 出笼总次数：${sum(st.map(x=>x.cnt))}，日均 ${(sum(st.map(x=>x.cnt))/ad.length).toFixed(1)} 次`);
  if(gp.length){
    lines.push(`- 出笼前笼内时长：平均 ${fmtHM(sum(gp)/gp.length)}，最长 ${fmtHM(Math.max(...gp))}，最短 ${fmtHM(Math.min(...gp))}`);
    lines.push(`- 间隔分布（≤${GREEN_H}h🟢 / ≥${RED_H}h🔴）：🟢${gp.filter(x=>gcls(x)==="gk").length} 次，🟡${gp.filter(x=>gcls(x)==="gm").length} 次，🔴${gp.filter(x=>gcls(x)==="gb").length} 次`);
  }
  lines.push("","## 🚶 遛狗");
  const wc=sum(ws.map(x=>x.cnt)),wm=sum(ws.map(x=>x.outMs));
  lines.push(wc?`- 共 ${wc} 次，累计 ${fmtHM(wm)}，日均 ${fmtHM(wm/ad.length)}，平均每次 ${fmtHM(wm/wc)}`:"- 无遛狗计时记录");
  lines.push("","## 🍽️ 饮食");
  const ml=L2.filter(x=>x.a==="meal"),tot=gramsOf(L2);
  lines.push(ml.length?`- 喂食 ${ml.length} 次，总量 ${tot}g，日均 ${Math.round(tot/ad.length)}g，平均每餐 ${Math.round(tot/ml.length)}g`:"- 无喂食记录");
  lines.push(`- 零食 ${L2.filter(x=>x.a==="snack").length} 次`);
  L2.filter(x=>x.a==="newfood").forEach(x=>lines.push(`- 新食物/换粮：${ymd(new Date(x.t))} ${x.n}`));
  lines.push("","## 💩 大便");
  const pl=L2.filter(x=>x.a==="poop");
  if(pl.length){
    const cnt={};pl.forEach(x=>cnt[x.v]=(cnt[x.v]||0)+1);
    lines.push(`- 共 ${pl.length} 次：`+Object.entries(cnt).map(([k,v])=>`${k}${v}次`).join("、"));
    pl.filter(x=>x.v!=="正常").forEach(x=>lines.push(`  - ${md(x.t)} ${x.v}｜${x.n}`));
  }else lines.push("- 无记录");
  lines.push("","## ⚠️ 异常事件");
  const al=L2.filter(x=>x.a==="abn");
  if(al.length){
    const cnt={};al.forEach(x=>cnt[x.v]=(cnt[x.v]||0)+1);
    lines.push(`- 共 ${al.length} 次：`+Object.entries(cnt).map(([k,v])=>`${k}${v}次`).join("、"));
    al.sort((x,y)=>x.t-y.t).forEach(x=>lines.push(`  - ${md(x.t)} ${x.v}｜${x.n}`));
  }else lines.push("- 无记录");
  lines.push("","## ⚖️ 体重");
  const wl=L2.filter(x=>x.a==="weight").sort((x,y)=>x.t-y.t);
  lines.push(wl.length?`- ${ymd(new Date(wl[0].t))}：${wl[0].v}kg → ${ymd(new Date(wl[wl.length-1].t))}：${wl[wl.length-1].v}kg（共 ${wl.length} 次称重）`:"- 无记录");
  lines.push("","## 💊 驱虫 / 疫苗状态");
  REM.forEach(r=>{
    const s2=remStatus(r,Math.min(em,now));
    lines.push(`- ${r.label}：`+(s2.last?`上次 ${ymd(new Date(s2.last.t))}，下次 ${ymd(s2.due)}（${s2.left<0?"已过期"+(-s2.left)+"天":"还有"+s2.left+"天"}）`:"未记录"));
  });
  const hl=L2.filter(x=>x.a==="health");
  if(hl.length){lines.push("","## 🩺 健康备注");hl.forEach(x=>lines.push(`- ${md(x.t)} ${x.n}`));}
  return lines.join("\n");
}

/* ====== 发送邮件 ====== */
async function sendMail(subject,text){
  const r=await fetch("https://api.resend.com/emails",{method:"POST",
    headers:{Authorization:"Bearer "+RESEND_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({from:"皂皂打卡 <onboarding@resend.dev>",to:[MAIL_TO],subject,text})});
  const j=await r.text();
  if(!r.ok)throw new Error("发送失败 "+r.status+" "+j.slice(0,200));
  console.log("已发送：",subject);
}

/* ====== 主流程 ====== */
(async()=>{
  log=await loadLogs();
  console.log("读取到记录条数：",log.length);

  // 若被 GitHub 延迟到凌晨（6点前），按"昨天"统计
  const n=new Date();
  const target=new Date(n.getFullYear(),n.getMonth(),n.getDate()-(n.getHours()<6?1:0));
  const next=new Date(target.getFullYear(),target.getMonth(),target.getDate()+1);
  const force=(FORCE||"").split(",").map(x=>x.trim()).filter(Boolean);
  const want=k=>force.includes(k);

  const jobs=[];
  jobs.push(["皂皂日报 "+ymd(target),target,next,"daily"]);
  if(target.getDay()===0||want("weekly")){
    const s=new Date(target.getFullYear(),target.getMonth(),target.getDate()-6);
    jobs.push([`皂皂周报 ${ymd(s)} ~ ${ymd(target)}`,s,next,"weekly"]);
  }
  if(next.getDate()===1||want("monthly")){
    const s=new Date(target.getFullYear(),target.getMonth(),1);
    const e=new Date(target.getFullYear(),target.getMonth()+1,1);
    jobs.push([`皂皂月报 ${target.getFullYear()}-${pad(target.getMonth()+1)}`,s,e,"monthly"]);
  }
  if((target.getMonth()===11&&target.getDate()===31)||want("yearly")){
    const s=new Date(target.getFullYear(),0,1),e=new Date(target.getFullYear()+1,0,1);
    jobs.push([`皂皂年报 ${target.getFullYear()}`,s,e,"yearly"]);
  }

  for(const [title,s,e] of jobs){
    await sendMail(title,periodReport(s,e,title));
    await sleep(1200);   // Resend 限速
  }
})().catch(e=>{console.error(e.message);process.exit(1);});
