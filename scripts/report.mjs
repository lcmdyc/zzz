const {SUPABASE_URL,SUPABASE_KEY,SB_EMAIL,SB_PASSWORD,RESEND_KEY,MAIL_TO,FORCE}=process.env;
for(const [k,v] of Object.entries({SUPABASE_URL,SUPABASE_KEY,SB_EMAIL,SB_PASSWORD,RESEND_KEY,MAIL_TO})){
  if(!v){console.error("缺少 Secret："+k);process.exit(1);}
}

/* ====== 云端没有配置时的兜底（等同原来的皂皂固定逻辑） ====== */
const FALLBACK={profiles:[{id:"zz",name:"皂皂",emoji:"🐶",items:[
  {id:"crate",name:"笼子",emoji:"🏠",type:"timer",goal:4,gaps:true,gg:3,rr:6},
  {id:"walk",name:"遛狗",emoji:"🚶",type:"timer",goal:0,gaps:false,gg:3,rr:6},
  {id:"meal",name:"喂食",emoji:"🍽️",type:"num",unit:"g",sum:true},
  {id:"snack",name:"零食",emoji:"🦴",type:"tap"},
  {id:"poop",name:"大便",emoji:"💩",type:"choice",opts:[{n:"正常",r:0},{n:"偏软",r:1},{n:"拉稀",r:2}]},
  {id:"abn",name:"异常事件",emoji:"⚠️",type:"choice",opts:[]},
  {id:"weight",name:"体重",emoji:"⚖️",type:"num",unit:"kg"},
  {id:"health",name:"健康备注",emoji:"🩺",type:"note"},
  {id:"inner",name:"内驱",emoji:"💊",type:"remind",d:90},
  {id:"outer",name:"外驱",emoji:"💊",type:"remind",d:30},
  {id:"vacc",name:"疫苗",emoji:"💉",type:"remind",d:365}
]}]};

/* ====== 工具 ====== */
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hm=t=>{const d=new Date(t);return pad(d.getHours())+":"+pad(d.getMinutes())};
const md=t=>{const d=new Date(t);return `${d.getMonth()+1}月${d.getDate()}日 ${hm(t)}`};
const sod=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
const fmtHM=ms=>{if(!ms||ms<0)return "0分";const m=Math.round(ms/60000),h=Math.floor(m/60);return h?`${h}时${pad(m%60)}分`:`${m}分`;};
const sum=a=>a.reduce((x,y)=>x+y,0);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const num=v=>{const x=parseFloat(v);return isNaN(x)?0:x;};

/* ====== 读取 Supabase ====== */
let log=[],cfg=null;
async function load(){
  const lr=await fetch(SUPABASE_URL+"/auth/v1/token?grant_type=password",{method:"POST",
    headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},body:JSON.stringify({email:SB_EMAIL,password:SB_PASSWORD})});
  const lj=await lr.json();
  if(!lr.ok)throw new Error("Supabase 登录失败："+(lj.error_description||lj.msg||lr.status));
  const H={apikey:SUPABASE_KEY,Authorization:"Bearer "+lj.access_token};
  // 配置
  try{
    const cr=await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.profiles&select=value`,{headers:H});
    if(cr.ok){const rows=await cr.json();if(rows[0]&&rows[0].value&&Array.isArray(rows[0].value.profiles))cfg=rows[0].value;}
  }catch(_){}
  if(!cfg){console.warn("云端没有 profiles 配置，使用内置皂皂模板");cfg=FALLBACK;}
  // 记录
  const all=[];let from=0;
  while(true){
    const r=await fetch(`${SUPABASE_URL}/rest/v1/logs?select=id,a,t,v,n&order=t.asc,id.asc`,{headers:{...H,Range:`${from}-${from+999}`}});
    if(!r.ok)throw new Error("读取数据失败 "+r.status+" "+(await r.text()).slice(0,100));
    const rows=await r.json();all.push(...rows);
    if(rows.length<1000)break;from+=1000;
  }
  log=all.map(e=>({...e,t:Number(e.t),v:e.v||"",n:e.n||""}));
}

/* ====== 计时计算（与网页一致） ====== */
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
const gcls=(it,ms)=>ms<=(+it.gg||0)*36e5?"gk":(ms>=(+it.rr||0)*36e5?"gb":"gm");

/* ====== 单个记录项的报告段落 ====== */
function itemLines(it,L2,ad,sm,em,now){
  const t=it.type,head=`### ${it.emoji||""} ${it.name}`;
  const mine=L2.filter(x=>x.a===it.id);
  if(t==="timer"){
    const c=calc(it.id+"_out",it.id+"_in"),st=ad.map(d=>dayStats(c,d,now));
    const cnt=sum(st.map(x=>x.cnt)),tot=sum(st.map(x=>x.outMs));
    if(!cnt&&!tot)return [head,"- 无记录"];
    const ls=[head];
    const goal=(+it.goal||0)*36e5;
    ls.push(`- 累计 ${fmtHM(tot)}，日均 ${fmtHM(tot/ad.length)}，共 ${cnt} 次，日均 ${(cnt/ad.length).toFixed(1)} 次`+(cnt?`，平均每次 ${fmtHM(tot/cnt)}`:""));
    if(goal)ls.push(`- 每日目标 ${fmtHM(goal)}，达标 ${st.filter(x=>x.outMs>=goal).length}/${ad.length} 天`);
    if(it.gaps){
      const gp=c.gaps.filter(x=>x[1]>=sm&&x[1]<em).map(x=>x[1]-x[0]);
      if(gp.length){
        ls.push(`- ${it.gapLbl||"间隔"}：平均 ${fmtHM(sum(gp)/gp.length)}，最长 ${fmtHM(Math.max(...gp))}，最短 ${fmtHM(Math.min(...gp))}`);
        ls.push(`- 间隔分布（≤${it.gg}h🟢 / ≥${it.rr}h🔴）：🟢${gp.filter(x=>gcls(it,x)==="gk").length} 次，🟡${gp.filter(x=>gcls(it,x)==="gm").length} 次，🔴${gp.filter(x=>gcls(it,x)==="gb").length} 次`);
      }
    }
    return ls;
  }
  if(t==="remind"){
    const days=+it.d||30,all=log.filter(e=>e.a===it.id&&e.t<Math.min(em,now));
    if(!all.length)return [head,"- 未记录"];
    const last=all.reduce((x,y)=>y.t>x.t?y:x);
    const due=new Date(sod(new Date(last.t))+days*864e5);
    const left=Math.round((sod(due)-sod(new Date(Math.min(em,now))))/864e5);
    return [head,`- 上次 ${ymd(new Date(last.t))}，下次 ${ymd(due)}（${left<0?"已过期"+(-left)+"天":"还有"+left+"天"}）`];
  }
  if(!mine.length)return [head,"- 无记录"];
  if(t==="tap"){
    const ls=[head,`- 共 ${mine.length} 次，日均 ${(mine.length/ad.length).toFixed(1)} 次`];
    if(+it.target){
      const per={};mine.forEach(x=>{const k=ymd(new Date(x.t));per[k]=(per[k]||0)+1;});
      ls.push(`- 每日目标 ${it.target} 次，达标 ${Object.values(per).filter(v=>v>=it.target).length}/${ad.length} 天`);
    }
    return ls;
  }
  if(t==="num"){
    const u=it.unit||"",vs=mine.map(x=>num(x.v)),ls=[head];
    if(it.sum){
      const tot=sum(vs);
      ls.push(`- 共 ${mine.length} 次，总量 ${Math.round(tot*10)/10}${u}，日均 ${Math.round(tot/ad.length*10)/10}${u}，平均每次 ${Math.round(tot/mine.length*10)/10}${u}`);
      if(+it.target)ls.push(`- 每日目标 ${it.target}${u}`);
    }else{
      const s=[...mine].sort((x,y)=>x.t-y.t);
      ls.push(`- ${ymd(new Date(s[0].t))}：${s[0].v}${u} → ${ymd(new Date(s[s.length-1].t))}：${s[s.length-1].v}${u}（共 ${mine.length} 次）`);
    }
    return ls;
  }
  if(t==="choice"){
    const cnt={};mine.forEach(x=>cnt[x.v]=(cnt[x.v]||0)+1);
    const ls=[head,`- 共 ${mine.length} 次：`+Object.entries(cnt).map(([k,v])=>`${k}${v}次`).join("、")];
    const rank=v=>{const o=(it.opts||[]).find(o=>o.n===v);return o?(+o.r||0):0;};
    const bad=mine.filter(x=>rank(x.v)>0||!(it.opts||[]).length).sort((x,y)=>x.t-y.t);
    bad.forEach(x=>ls.push(`  - ${md(x.t)} ${x.v}${x.n?"｜"+x.n:""}`));
    return ls;
  }
  // note
  return [head,...mine.sort((x,y)=>x.t-y.t).map(x=>`- ${md(x.t)} ${x.n||x.v}`)];
}

/* ====== 生成报告 ====== */
function periodReport(s,e,title){
  const sm=s.getTime(),em=e.getTime(),now=Date.now();
  const days=[];
  for(let d=new Date(s);d<e;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1))days.push(d);
  const lines=[`# ${title}`,`周期：${ymd(s)} ~ ${ymd(new Date(em-1))}`,""];
  cfg.profiles.forEach(p=>{
    const ids=new Set(p.items.flatMap(it=>it.type==="timer"?[it.id+"_out",it.id+"_in"]:[it.id]));
    const L2=log.filter(x=>x.t>=sm&&x.t<em&&ids.has(x.a));
    const act=new Set(L2.map(x=>ymd(new Date(x.t))));
    const ad=days.filter(d=>act.has(ymd(d)));
    lines.push(`## ${p.emoji||""} ${p.name}`,`有记录的天数：${ad.length} / ${days.length}`,"");
    if(!ad.length){
      // 没记录也要显示周期提醒状态
      p.items.filter(it=>it.type==="remind").forEach(it=>lines.push(...itemLines(it,L2,ad,sm,em,now),""));
      if(!p.items.some(it=>it.type==="remind"))lines.push("该期间没有记录。","");
      else lines.push("该期间没有其他记录。","");
      return;
    }
    p.items.forEach(it=>lines.push(...itemLines(it,L2,ad,sm,em,now),""));
  });
  return lines.join("\n");
}

/* ====== 发送邮件 ====== */
async function sendMail(subject,text){
  const r=await fetch("https://api.resend.com/emails",{method:"POST",
    headers:{Authorization:"Bearer "+RESEND_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({from:"打卡 <onboarding@resend.dev>",to:[MAIL_TO],subject,text})});
  const j=await r.text();
  if(!r.ok)throw new Error("发送失败 "+r.status+" "+j.slice(0,200));
  console.log("已发送：",subject);
}

/* ====== 主流程 ====== */
(async()=>{
  await load();
  console.log("读取到记录条数：",log.length,"；档案数：",cfg.profiles.length);

  // 若被 GitHub 延迟到凌晨（6点前），按"昨天"统计
  const n=new Date();
  const target=new Date(n.getFullYear(),n.getMonth(),n.getDate()-(n.getHours()<6?1:0));
  const next=new Date(target.getFullYear(),target.getMonth(),target.getDate()+1);
  const force=(FORCE||"").split(",").map(x=>x.trim()).filter(Boolean);
  const want=k=>force.includes(k);

  const jobs=[];
  jobs.push(["打卡日报 "+ymd(target),target,next]);
  if(target.getDay()===0||want("weekly")){
    const s=new Date(target.getFullYear(),target.getMonth(),target.getDate()-6);
    jobs.push([`打卡周报 ${ymd(s)} ~ ${ymd(target)}`,s,next]);
  }
  if(next.getDate()===1||want("monthly")){
    const s=new Date(target.getFullYear(),target.getMonth(),1);
    const e=new Date(target.getFullYear(),target.getMonth()+1,1);
    jobs.push([`打卡月报 ${target.getFullYear()}-${pad(target.getMonth()+1)}`,s,e]);
  }
  if((target.getMonth()===11&&target.getDate()===31)||want("yearly")){
    const s=new Date(target.getFullYear(),0,1),e=new Date(target.getFullYear()+1,0,1);
    jobs.push([`打卡年报 ${target.getFullYear()}`,s,e]);
  }

  for(const [title,s,e] of jobs){
    await sendMail(title,periodReport(s,e,title));
    await sleep(1200);   // Resend 限速
  }
})().catch(e=>{console.error(e.message);process.exit(1);});
