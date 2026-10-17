/* ====== Supabase 云同步（增量记录 + 配置） ====== */
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
async function sync(){
  if(!sbReady())return;
  if(syncing){again=true;return;}
  syncing=true;setStat("同步中…");
  try{
    // 1. 同步配置 (settings 表，key='profiles')
    const rCfg=await sbReq("settings?select=updated_at,value&key=eq.profiles");
    const row=(await rCfg.json())[0];
    const remoteTs=row?Number(row.updated_at)||0:0;
    const localTs=+(localStorage.getItem("cfg_ts")||0);
    if(row&&row.value&&remoteTs>localTs){
      cfg=row.value;saveCfg();
      localStorage.setItem("cfg_ts",remoteTs); // 覆盖 saveCfg 写入的“当前时间”，避免来回覆盖
      render();
    }else if(localTs>remoteTs){
      await sbReq("settings?on_conflict=key",{method:"POST",
        headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
        body:JSON.stringify({key:"profiles",value:cfg,updated_at:localTs})});
    }

    // 2. 同步记录 (logs 表)
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
    const since=hasBase?Date.now()-62*864e5:0;
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
    setStat("✅ 已同步 "+md(Date.now()));
    render();
  }catch(err){setStat("⚠️ "+err.message);}
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
