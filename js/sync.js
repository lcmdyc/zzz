/* ====== Supabase 云同步（增量 + 配置） ====== */
const L=k=>localStorage.getItem(k)||"";
let sess=JSON.parse(L("sb_sess")||"null"),syncing=false,again=false;
const sbReady=()=>L("sb_url")&&L("sb_key")&&sess;
const setStat=s=>$("sbStat").textContent=s;
function setSess(j){sess={access:j.access_token,refresh:j.refresh_token,exp:Date.now()+j.expires_in*1000};localStorage.setItem("sb_sess",JSON.stringify(sess));}
async function sbLogin(email,pw){
  const r=await fetch(L("sb_url")+"/auth/v1/token?grant_type=password",{method:"POST",headers:{apikey:L("sb_key"),"Content-Type":"application/json"},body:JSON.stringify({email,password:pw})});
  const j=await r.json();if(!r.ok)throw new Error(j.error_description||j.msg||"登录失败");setSess(j);
}
async function sbToken(){
  if(sess.exp-60000>Date.now())return sess.access;
  const r=await fetch(L("sb_url")+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:L("sb_key"),"Content-Type":"application/json"},body:JSON.stringify({refresh_token:sess.refresh})});
  const j=await r.json();if(!r.ok){sess=null;localStorage.removeItem("sb_sess");throw new Error("登录已过期，请重新登录");}
  setSess(j);return sess.access;
}
async function sbReq(path,opt={}){
  const tk=await sbToken();
  const r=await fetch(L("sb_url")+"/rest/v1/"+path,{...opt,headers:{apikey:L("sb_key"),Authorization:"Bearer "+tk,"Content-Type":"application/json",...(opt.headers||{})}});
  if(!r.ok)throw new Error("同步失败 "+r.status+" "+(await r.text()).slice(0,80));
  return r;
}

/* ---------- 配置同步：settings 表，以 updated_at 新者为准 ---------- */
const CFG_KEY="p2_cfg",CFG_AT="p2_cfg_at";
async function syncCfg(){
  const raw=L(CFG_KEY);
  let lts=+L(CFG_AT)||0;
  const r=await sbReq(`settings?key=eq.${CFG_KEY}&select=value,updated_at`);
  const rows=await r.json();
  const remote=rows[0],rts=remote?Date.parse(remote.updated_at)||0:0;
  if(remote&&rts>lts+1000){
    // 云端更新：覆盖本机配置并重新加载页面
    localStorage.setItem(CFG_KEY,JSON.stringify(remote.value));
    localStorage.setItem(CFG_AT,String(rts));
    location.reload();
    return true;
  }
  if(raw&&(!remote||lts>rts+1000||(!lts&&!remote))){
    if(!lts){lts=Date.now();localStorage.setItem(CFG_AT,String(lts));}
    await sbReq("settings?on_conflict=key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({key:CFG_KEY,value:JSON.parse(raw),updated_at:new Date(lts).toISOString()})});
  }
  return false;
}
// 每次保存配置时打时间戳并触发同步（包一层，不改 profiles.js）
if(typeof saveCfg==="function"){
  const _saveCfg=saveCfg;
  saveCfg=function(){const x=_saveCfg.apply(this,arguments);localStorage.setItem(CFG_AT,String(Date.now()));setTimeout(sync,300);return x;};
}

async function sync(){
  if(!sbReady())return;
  if(syncing){again=true;return;}
  syncing=true;setStat("同步中…");
  try{
    if(await syncCfg()){syncing=false;return;}
    const hasBase=!!L("sb_synced");
    const synced=new Set(JSON.parse(L("sb_synced")||"[]"));
    const ids=new Set(log.map(e=>e.id));
    const add=log.filter(e=>!synced.has(e.id));
    const del=[...synced].filter(i=>!ids.has(i));
    const addIds=new Set(add.map(e=>e.id));
    for(let i=0;i<add.length;i+=500){
      await sbReq("logs?on_conflict=id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify(add.slice(i,i+500).map(e=>({id:e.id,a:e.a,t:e.t,v:e.v||"",n:e.n||""})))});
    }
    for(let i=0;i<del.length;i+=100){
      await sbReq("logs?id=in.("+del.slice(i,i+100).map(encodeURIComponent).join(",")+")",{method:"DELETE"});
    }
    const since=hasBase?Date.now()-62*864e5:0;   // 平时只拉最近62天，省流量
    let all=[],from=0;
    while(true){
      const r=await sbReq(`logs?select=id,a,t,v,n&t=gte.${since}&order=t.asc,id.asc`,{headers:{Range:`${from}-${from+999}`}});
      const rows=await r.json();all.push(...rows);
      if(rows.length<1000)break;from+=1000;
    }
    const remote=new Set(all.map(e=>e.id));
    const old=log.filter(e=>e.t<since);
    const extra=log.filter(e=>e.t>=since&&!remote.has(e.id)&&!synced.has(e.id)&&!addIds.has(e.id));
    log=[...old,...all.map(e=>({...e,t:Number(e.t)})),...extra];
    localStorage.setItem(KEY,JSON.stringify(log));
    const keepOld=old.filter(e=>synced.has(e.id)||addIds.has(e.id)).map(e=>e.id);
    localStorage.setItem("sb_synced",JSON.stringify([...keepOld,...remote]));
    setStat("✅ 已同步 "+md(Date.now())+"（本机共 "+log.length+" 条）");
    render();
  }catch(err){setStat("⚠️ "+err.message+"（本地数据已保存，稍后自动重试）");}
  syncing=false;
  if(again){again=false;sync();}
}
$("sbUrl").value=L("sb_url");$("sbKey").value=L("sb_key");
$("sbLogin").onclick=async()=>{
  localStorage.setItem("sb_url",$("sbUrl").value.trim().replace(/\/$/,""));
  localStorage.setItem("sb_key",$("sbKey").value.trim());
  try{await sbLogin($("sbEmail").value.trim(),$("sbPw").value);$("sbPw").value="";localStorage.removeItem("sb_synced");await sync();}
  catch(e){setStat("⚠️ "+e.message);}
};
$("sbSync").onclick=sync;
$("sbOut").onclick=()=>{sess=null;localStorage.removeItem("sb_sess");localStorage.removeItem("sb_synced");setStat("已退出登录");};
setStat(sbReady()?"已登录":"未登录");
document.addEventListener("visibilitychange",()=>{if(!document.hidden)sync();});
setInterval(()=>{if(!document.hidden)sync();},120000);
