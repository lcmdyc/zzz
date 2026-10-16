/* ====== 档案与记录项：数据层 ======
   依赖：config.js 里的 TPL_ZZ()、TPL_ME(pid)
   被 core / ui / charts / report / sync / main 使用。

   配置结构 cfg = { profiles:[ {id,name,emoji,items:[item...]} ] }
   item 公共字段：id, name, emoji, type, cat, keep(月报清理时保留)
     tap   : target(每日目标次数，0=无)
     num   : unit, quick[](快捷值), target, sum(显示当日合计), chart(趋势图)
     choice: opts[{n,c,r}](名称/颜色/严重度), cal(状态日历), ctx(关联信息，仅皂皂档案), cls
     note  : 无额外字段
     remind: d(周期天数)
     timer : lo/li(开始/结束按钮文字), eo/ei(开始/结束图标), tOpen/tShut(状态文字),
             goal(每日目标小时), gaps(是否统计间隔), gapLbl(间隔名称), gg/rr(绿/红灯阈值小时),
             chart(每日时长图), gchart(间隔图)
   计时项 id=X，实际记录的 id 为 X_out 和 X_in（与旧数据一致）。
   所有 id 全局唯一（旧 id 保持不变，新 id 以 p2_ 开头），所以不用给记录加档案字段。 */

const CFG_K="p2_cfg",CFG_T="p2_cfg_t",CUR_K="p2_cur";
const TYPES=[["tap","普通打卡"],["num","数值"],["choice","状态"],["note","备注"],["timer","计时"],["remind","周期提醒"]];
const TYPE_NAME=Object.fromEntries(TYPES);
const rnd=()=>Math.random().toString(36).slice(2,6);

/* ---------- 加载与规范化 ---------- */
function normCfg(c){
  if(!c||!Array.isArray(c.profiles)||!c.profiles.length)return null;
  c.profiles.forEach(p=>{
    p.items=Array.isArray(p.items)?p.items:[];
    p.emoji=p.emoji||"📒";
    p.items.forEach(it=>{
      if(it.type==="choice")it.opts=(it.opts||[]).map(o=>typeof o==="string"?{n:o,c:"#3c9a4a",r:0}:o);
    });
  });
  return c;
}
let cfg=(()=>{
  let c=null;try{c=normCfg(JSON.parse(localStorage.getItem(CFG_K)||"null"));}catch(_){}
  return c||{profiles:[TPL_ZZ(),TPL_ME("me")]};
})();
let curId=localStorage.getItem(CUR_K)||"zz";
let IDX={};
function reindex(){
  IDX={};
  cfg.profiles.forEach(p=>p.items.forEach(it=>{
    IDX[it.id]={p,it,role:"main"};
    if(it.type==="timer"){IDX[it.id+"_out"]={p,it,role:"out"};IDX[it.id+"_in"]={p,it,role:"in"};}
  }));
  if(!cfg.profiles.some(p=>p.id===curId))curId=cfg.profiles[0].id;
}
reindex();

/* ---------- 保存（修改配置后调用） ---------- */
function saveCfg(){
  localStorage.setItem(CFG_K,JSON.stringify(cfg));
  localStorage.setItem(CFG_T,String(Date.now()));
  reindex();
  if(typeof sync==="function")sync();
}

/* ---------- 查询 ---------- */
const curP=()=>cfg.profiles.find(p=>p.id===curId)||cfg.profiles[0];
function setCur(id){curId=id;localStorage.setItem(CUR_K,id);}
const idsOfItem=it=>it.type==="timer"?[it.id+"_out",it.id+"_in"]:[it.id];
const idsOfProf=p=>p.items.flatMap(idsOfItem);
const isTimer=id=>!!(IDX[id]&&IDX[id].it.type==="timer");
const timerKey=id=>IDX[id]?IDX[id].it.id:null;        // crate_out -> crate
const profOf=id=>IDX[id]?IDX[id].p:null;
/* 兼容旧代码：按记录 id 取"动作"，用于显示名称、图标等 */
function A(id){
  const x=IDX[id];if(!x)return null;const it=x.it;
  if(x.role==="out")return {id,name:it.lo||"开始",emoji:it.eo||it.emoji,type:"tap",cat:it.name,timer:true};
  if(x.role==="in")return {id,name:it.li||"结束",emoji:it.ei||it.emoji,type:"tap",cat:it.name,timer:true};
  return it;
}
const optNames=it=>(it.opts||[]).map(o=>o.n);
const optOf=(it,v)=>(it.opts||[]).find(o=>o.n===v);
const optColor=(it,v)=>(optOf(it,v)||{}).c||"#999";
const optRank=(it,v)=>{const o=optOf(it,v);return o?(+o.r||0):0;};
const profLog=p=>{const s=new Set(idsOfProf(p));return log.filter(e=>s.has(e.a));};

/* ---------- 计时项辅助 ---------- */
const tcalc=it=>calc(it.id+"_out",it.id+"_in");
const tgoal=it=>(+it.goal||0)*36e5;
const tcls=(it,ms)=>ms<=(+it.gg||0)*36e5?"gk":(ms>=(+it.rr||0)*36e5?"gb":"gm");
const temo=(it,ms)=>({gk:"🟢",gm:"🟡",gb:"🔴"})[tcls(it,ms)];
const tcol=(it,ms)=>({gk:"#3c9a4a",gm:"#e0903a",gb:"#d9534f"})[tcls(it,ms)];

/* ---------- 周期提醒辅助 ---------- */
function remStatus(it){
  const days=+it.d||30;
  const mine=log.filter(e=>e.a===it.id);
  const last=mine.length?mine.reduce((x,y)=>y.t>x.t?y:x):null;
  if(!last)return {days,last:null};
  const due=new Date(sod(new Date(last.t))+days*864e5);
  const left=Math.round((sod(due)-sod(new Date()))/864e5);
  return {days,last,due,left};
}

/* ---------- 新建 ---------- */
const newItemId=p=>`p2_${p.id}_${rnd()}${rnd()}`;
function newItem(type,p){
  const it={id:newItemId(p),name:"",emoji:"📝",type,cat:"",keep:false};
  if(type==="tap")Object.assign(it,{target:0});
  if(type==="num")Object.assign(it,{unit:"",quick:[],target:0,sum:false,chart:true});
  if(type==="choice")Object.assign(it,{opts:[{n:"正常",c:"#3c9a4a",r:0},{n:"一般",c:"#d9a21b",r:1},{n:"较差",c:"#d9534f",r:2}],cal:true,ctx:false});
  if(type==="remind")Object.assign(it,{d:30,keep:true});
  if(type==="timer")Object.assign(it,{lo:"开始",li:"结束",eo:"▶️",ei:"⏹️",tOpen:"进行中",tShut:"空闲",goal:0,gaps:false,gapLbl:"距上次间隔",gg:3,rr:6,chart:true,gchart:false});
  return it;
}
function addProfile(name,emoji,tpl){
  const id="p"+rnd()+rnd();
  const p=tpl==="me"?TPL_ME(id):{items:[]};
  p.id=id;p.name=name;p.emoji=emoji||p.emoji||"📒";
  cfg.profiles.push(p);saveCfg();return p;
}
function removeProfile(id){   // 只删配置；记录是否删除由调用方决定
  if(cfg.profiles.length<2)return false;
  cfg.profiles=cfg.profiles.filter(p=>p.id!==id);
  saveCfg();return true;
}

/* ---------- 配置云同步（由 sync() 调用） ----------
   云端表 settings(key,value,updated_at)，只有一行 key='profiles'。谁的时间新用谁。
   返回 true 表示本地配置被云端覆盖，调用方需要重新渲染。 */
async function syncCfg(){
  const r=await sbReq("settings?key=eq.profiles&select=value,updated_at");
  const rm=(await r.json())[0];
  const lt=+localStorage.getItem(CFG_T)||0;
  if(rm&&+rm.updated_at>lt){
    const c=normCfg(rm.value);
    if(c){cfg=c;localStorage.setItem(CFG_K,JSON.stringify(cfg));localStorage.setItem(CFG_T,String(rm.updated_at));reindex();return true;}
    return false;
  }
  if(!rm||lt>+rm.updated_at){
    const t=lt||Date.now();
    await sbReq("settings?on_conflict=key",{method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=minimal"},
      body:JSON.stringify({key:"profiles",value:cfg,updated_at:t})});
    localStorage.setItem(CFG_T,String(t));
  }
  return false;
}
