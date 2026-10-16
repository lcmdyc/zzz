/* ====== 实时面板 ====== */
function renderLive(){
  const now=Date.now(),c=crateC(),isOut=c.open!==null,g=goalMs();
  $("crate").className="card"+(isOut?"":" in");
  $("cwarn").textContent="";
  if(isOut){
    $("cst").textContent="🟢 正在笼外";$("csince").textContent="出笼于 "+md(c.open);
    $("ctm").textContent=fmtHMS(now-c.open);$("ctm").style.color="#3c9a4a";$("ctoggle").textContent="🔒 进笼（记录）";
  }else if(c.lastIn!==null){
    const d=now-c.lastIn;
    $("cst").textContent=gemo(d)+" 在笼内";$("csince").textContent="进笼于 "+md(c.lastIn);
    $("ctm").textContent=fmtHMS(d);$("ctm").style.color=gcol(d);$("ctoggle").textContent="🔓 出笼（记录）";
    if(gcls(d)==="gb")$("cwarn").innerHTML=`<b style="color:#d9534f">已超过 ${rH()} 小时，该放出来了</b>`;
  }else{
    $("cst").textContent="暂无笼子记录";$("csince").textContent="扫一次贴片或点下方按钮开始";
    $("ctm").textContent="--:--:--";$("ctm").style.color="#999";$("ctoggle").textContent="🔓 出笼（记录）";
  }
  const s=dayStats(c,new Date(),now);
  $("s1").textContent=fmtHM(s.outMs);$("s2").textContent=s.cnt+" 次";
  $("s3").innerHTML=s.gN?`<span class="bd ${gcls(s.gAvg)}">${fmtHM(s.gAvg)}</span>`:"-";
  $("s4").innerHTML=s.gN?`<span class="bd ${gcls(s.gMax)}">${fmtHM(s.gMax)}</span>`:"-";
  $("cbar").style.width=(g?Math.min(100,s.outMs/g*100):0)+"%";
  $("cgoal").textContent=g?`今日目标 ${fmtHM(g)}，已完成 ${Math.min(100,Math.round(s.outMs/g*100))}%`:"未设置每日目标";
  const ds0=sod(new Date());
  const tg=c.gaps.filter(x=>x[1]>=ds0);
  $("gaplist").innerHTML=tg.length?tg.map(x=>`<span class="bd ${gcls(x[1]-x[0])}">${hm(x[1])} 出笼 · 之前笼内 ${fmtHM(x[1]-x[0])}</span>`).join(""):'<span class="tip">今天还没有可计算的出笼间隔</span>';

  const w=walkC(),ws=dayStats(w,new Date(),now);
  if(w.open!==null){$("wst").textContent="🟢 遛狗中";$("wsince").textContent="出门于 "+md(w.open);$("wtm").textContent=fmtHMS(now-w.open);$("wtoggle").textContent="🏠 遛狗回家（记录）";}
  else{$("wst").textContent="🏠 在家";$("wsince").textContent=w.out.length?"上次遛狗 "+md(w.out[w.out.length-1][0])+"，"+fmtHM(w.out[w.out.length-1][1]-w.out[w.out.length-1][0]):"暂无遛狗记录";$("wtm").textContent="--:--:--";$("wtoggle").textContent="🚶 出门遛狗（记录）";}
  $("wtoday").textContent=`今日遛狗 ${ws.cnt} 次，共 ${fmtHM(ws.outMs)}`;
}
setInterval(renderLive,1000);

/* ====== 记录 ====== */
function record(a,v,n,t){
  t=t||Date.now();const act=A(a);
  let note=n||"";
  if(act.ctx){const cx=ctxText(a,t);note=[cx,note].filter(Boolean).join(" ｜ ");}
  const e={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),a,t,v:v||"",n:note};
  log.push(e);lastAdded=e.id;
  let extra="";
  if(a==="crate_out"){const g=crateC().gaps.find(x=>x[1]===t);if(g)extra=`，${gemo(g[1]-g[0])} 出笼前笼内 ${fmtHM(g[1]-g[0])}`;}
  if(a==="crate_in"){const o=crateC().out.find(x=>x[1]===t);if(o)extra=`，本次笼外 ${fmtHM(o[1]-o[0])}`;}
  if(a==="walk_in"){const o=walkC().out.find(x=>x[1]===t);if(o)extra=`，本次遛狗 ${fmtHM(o[1]-o[0])}`;}
  save();render();
  showToast(`✅ 已记录：${act.emoji} ${act.name}${v?"（"+v+(a==="meal"?"g":"")+"）":""} ${hm(t)}${extra}`,true);
  if(navigator.vibrate)navigator.vibrate(60);
}
function showToast(msg,undo){
  const t=$("toast");$("tmsg").textContent=msg;$("tundo").style.display=undo?"":"none";
  t.className="";t.style.display="flex";clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.style.display="none",7000);
}
function warnToast(msg){const t=$("toast");$("tmsg").textContent=msg;$("tundo").style.display="none";t.className="warn";t.style.display="flex";clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.style.display="none",6000);}
$("tundo").onclick=()=>{if(!lastAdded)return;log=log.filter(e=>e.id!==lastAdded);lastAdded=null;save();render();$("toast").style.display="none";};

/* ====== 弹窗 ====== */
const closeModal=()=>$("modal").style.display="none";
function openModal(a){
  const act=A(a);let val="";
  $("mbox").className="box";
  let h=`<h3>${act.emoji} ${esc(act.name)}</h3>`;
  if(act.type==="meal")h+=`<div class="opts">${act.grams.map(g=>`<button data-g="${g}">${g}g</button>`).join("")}</div><div class="tip">点克数直接记录，或输入其他克数：</div>`;
  if(act.type==="num"||act.type==="meal")h+=`<input id="mv" type="number" step="0.1" inputmode="decimal" placeholder="${act.type==="meal"?"克数":"输入数值"}">`;
  if(act.type==="choice")h+=`<div class="opts">${act.opts.map(o=>`<button data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  h+=`<input id="mn" type="text" placeholder="${act.type==="note"?"备注内容":"备注（可选）"}">`;
  if(act.ctx)h+=`<p class="tip">会自动附带：距上餐时间、前24小时喂食量等关联信息</p>`;
  h+=`<div class="row"><button class="g" id="mc">取消</button><button id="mok">记录</button></div>`;
  $("mbox").innerHTML=h;$("modal").style.display="flex";
  $("mbox").querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{closeModal();record(a,b.dataset.g,$("mn").value.trim());});
  $("mbox").querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{val=b.dataset.o;$("mbox").querySelectorAll("[data-o]").forEach(x=>x.classList.toggle("sel",x===b));});
  $("mc").onclick=closeModal;
  $("mok").onclick=()=>{
    if(act.type==="num"||act.type==="meal"){val=$("mv").value;if(!val){$("mv").focus();return;}}
    if(act.type==="choice"&&!val){warnToast("请先选一个选项");return;}
    const n=$("mn").value.trim();
    if(act.type==="note"&&!n){$("mn").focus();return;}
    closeModal();record(a,val,n);
  };
}

/* 补录 */
$("backfill").onclick=()=>{
  const d=new Date();const iso=`${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const opts=[["crate_out","🔓 出笼"],["crate_in","🔒 进笼"],["walk_out","🚶 出门遛狗"],["walk_in","🏠 遛狗回家"],...ACTIONS.filter(a=>!a.hide).map(a=>[a.id,a.emoji+" "+a.name])];
  $("mbox").className="box";
  $("mbox").innerHTML=`<h3>⏱ 补录</h3>
    <select id="bs">${opts.map(o=>`<option value="${o[0]}">${o[1]}</option>`).join("")}</select>
    <input id="bv" placeholder="值（选填：克数/体重/大便状态/异常类型）">
    <input id="bn" placeholder="备注（选填）">
    <input id="bt" type="datetime-local" value="${iso}">
    <div class="row"><button class="g" id="mc">取消</button><button id="mok">补录</button></div>`;
  $("modal").style.display="flex";
  $("mc").onclick=closeModal;
  $("mok").onclick=()=>{
    const t=new Date($("bt").value).getTime();
    if(!t||t>Date.now()+60000){warnToast("请选择有效的过去时间");return;}
    closeModal();record($("bs").value,$("bv").value.trim(),$("bn").value.trim(),t);
  };
};

/* ====== 切换类动作 ====== */
function toggleAction(a){
  const key=a.startsWith("crate")?"crate":"walk",o=key+"_out",i=key+"_in";
  const c=calc(o,i);
  if(a===key)a=c.open!==null?i:o;
  if(a===o&&c.open!==null){warnToast(`已经在${key==="crate"?"笼外":"遛狗中"}了（${md(c.open)}）。如漏扫，请用「补录」`);return;}
  if(a===i&&c.open===null){
    if(key==="walk"){warnToast("当前没有遛狗中的记录。如漏扫了出门，请用「补录」");return;}
    if(c.lastIn!==null){warnToast(`已经在笼内了（${md(c.lastIn)} 进笼）。如漏扫了出笼，请用「补录」`);return;}
  }
  record(a);
}
function trigger(a){
  if(TOG.includes(a))return toggleAction(a);
  A(a).type==="tap"?record(a):openModal(a);
}
$("ctoggle").onclick=()=>trigger("crate");
$("wtoggle").onclick=()=>trigger("walk");
$("goal").value=localStorage.getItem(GK)||"4";$("gg").value=localStorage.getItem(GG)||"3";$("gr").value=localStorage.getItem(GR)||"6";
$("goal").onchange=()=>{localStorage.setItem(GK,$("goal").value||"0");render();};
$("gg").onchange=()=>{localStorage.setItem(GG,$("gg").value||"0");render();};
$("gr").onchange=()=>{localStorage.setItem(GR,$("gr").value||"0");render();};

/* ====== 到期提醒 ====== */
function remStatus(r){
  const iv=JSON.parse(localStorage.getItem(IV)||"{}"),days=+iv[r.id]||r.d;
  const mine=log.filter(e=>e.a===r.id);const last=mine.length?mine.reduce((x,y)=>y.t>x.t?y:x):null;
  if(!last)return {days,last:null};
  const due=new Date(sod(new Date(last.t))+days*864e5);
  const left=Math.round((sod(due)-sod(new Date()))/864e5);
  return {days,last,due,left};
}
function renderRem(){
  $("rem").innerHTML=REM.map(r=>{
    const s=remStatus(r);let cls="gy",txt="未记录";
    if(s.last){cls=s.left<0?"gb":(s.left<=7?"gm":"gk");txt=s.left<0?`已过期 ${-s.left} 天`:(s.left===0?"今天到期":`还有 ${s.left} 天`);}
    return `<div class="rem"><span class="nm">${r.emoji} ${r.label}</span><span class="bd ${cls}">${txt}</span>
      <span class="inf">${s.last?`上次 ${ymd(new Date(s.last.t))}，下次 ${ymd(s.due)}`:"点右侧按钮记录第一次"}</span>
      <span style="font-size:12px;color:#888">周期<input type="number" min="1" value="${s.days}" data-iv="${r.id}">天</span>
      <button class="s" data-rec="${r.id}">已完成</button></div>`;
  }).join("");
  document.querySelectorAll("[data-iv]").forEach(i=>i.onchange=()=>{const o=JSON.parse(localStorage.getItem(IV)||"{}");o[i.dataset.iv]=+i.value;localStorage.setItem(IV,JSON.stringify(o));renderRem();});
  document.querySelectorAll("[data-rec]").forEach(b=>b.onclick=()=>record(b.dataset.rec));
}

/* ====== 页面渲染 ====== */
function render(){
  const now=new Date();$("today").textContent=`${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
  const td=ymd(now),vis=ACTIONS.filter(a=>!a.hide);
  renderRem();
  $("cards").innerHTML=vis.map(a=>{
    const mine=log.filter(e=>e.a===a.id);
    const todays=mine.filter(e=>ymd(new Date(e.t))===td);
    const last=mine.length?mine.reduce((x,y)=>y.t>x.t?y:x):null;
    const ok=a.target&&todays.length>=a.target;
    let cnt=a.target?`${todays.length}/${a.target}`:`今日 ${todays.length} 次`;
    if(a.type==="meal")cnt+=` · ${gramsOf(todays)}g`;
    return `<div class="a ${ok?"ok":""} ${a.cls||""}" data-a="${a.id}">
      <div class="t">${a.emoji} ${esc(a.name)}</div><div class="c">${cnt}</div>
      <div class="l">${last?"上次 "+md(last.t)+(last.v?" · "+esc(last.v)+(a.type==="meal"?"g":""):""):"暂无记录"}</div></div>`;
  }).join("");
  document.querySelectorAll(".a").forEach(el=>el.onclick=()=>trigger(el.dataset.a));

  // 周表
  const day=(now.getDay()+6)%7;
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-day+weekOff*7);
  const ds=[...Array(7)].map((_,i)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+i));
  const names=["一","二","三","四","五","六","日"];
  $("wlabel").textContent=`${ymd(ds[0])} ~ ${ymd(ds[6])}${weekOff===0?"（本周）":""}`;
  let h="<tr><th>项目</th>"+ds.map((d,i)=>`<th>周${names[i]}<br><small>${d.getMonth()+1}/${d.getDate()}</small></th>`).join("")+"</tr>";
  const c=crateC(),w=walkC(),g=goalMs(),nm=Date.now();
  const st=ds.map(d=>dayStats(c,d,nm)),wt=ds.map(d=>dayStats(w,d,nm));
  h+=`<tr><td class="n"><b>🔓 出笼时长</b></td>`+st.map(s=>`<td class="${s.outMs?(g&&s.outMs>=g?"g":"p"):""}">${s.outMs?fmtHM(s.outMs):""}</td>`).join("")+"</tr>";
  h+=`<tr><td class="n">　出笼次数</td>`+st.map(s=>`<td>${s.cnt||""}</td>`).join("")+"</tr>";
  h+=`<tr><td class="n">　平均出笼前笼内</td>`+st.map(s=>`<td class="${s.gN?gcls(s.gAvg):""}">${s.gN?fmtHM(s.gAvg):""}</td>`).join("")+"</tr>";
  h+=`<tr><td class="n">　最长出笼前笼内</td>`+st.map(s=>`<td class="${s.gN?gcls(s.gMax):""}">${s.gN?fmtHM(s.gMax):""}</td>`).join("")+"</tr>";
  h+=`<tr><td class="n"><b>🚶 遛狗时长</b></td>`+wt.map(s=>`<td class="${s.outMs?"g":""}">${s.outMs?fmtHM(s.outMs)+(s.cnt>1?"<br><small>"+s.cnt+"次</small>":""):""}</td>`).join("")+"</tr>";
  vis.forEach(a=>{
    h+=`<tr><td class="n">${a.emoji} ${esc(a.name)}</td>`;
    ds.forEach(d=>{
      const es=dayLog(a.id,d);let cls="",txt="",sty="";
      if(es.length){
        const last=es[es.length-1];
        if(a.type==="num"){txt=esc(last.v);cls="g";}
        else if(a.type==="choice"){txt=esc(last.v)+(es.length>1?"×"+es.length:"");if(a.id==="abn")cls="bad";else sty=`color:${PC[last.v]||"#333"};font-weight:700`;}
        else if(a.type==="meal"){txt=`${es.length}/${a.target}<br><small>${gramsOf(es)}g</small>`;cls=es.length>=a.target?"g":"p";}
        else{txt=a.target?`${es.length}/${a.target}`:"✓"+(es.length>1?es.length:"");cls=a.target?(es.length>=a.target?"g":"p"):"g";}
      }
      h+=`<td class="${cls}" style="${sty}">${txt}</td>`;
    });
    h+="</tr>";
  });
  const tg=vis.filter(a=>a.target);
  h+="<tr><td class='n'><b>目标完成</b></td>"+ds.map(d=>`<td><b>${tg.filter(a=>dayLog(a.id,d).length>=a.target).length}/${tg.length}</b></td>`).join("")+"</tr>";
  $("week").innerHTML=h;

  // 大便
  const poops=log.filter(e=>e.a==="poop").sort((x,y)=>y.t-x.t);
  const p7=poops.filter(e=>e.t>Date.now()-7*864e5);
  $("poopsum").textContent=p7.length?`近7天共 ${p7.length} 次，非正常 ${p7.filter(e=>e.v!=="正常").length} 次`:"近7天暂无大便记录";
  $("poops").innerHTML=poops.length?poops.slice(0,12).map(e=>`<div class="pi"><span class="bd" style="background:${PC[e.v]||"#999"};color:#fff">${esc(e.v||"?")}</span><b>${md(e.t)}</b><div class="tip" style="margin-top:2px">${esc(e.n)||"无关联信息"}</div></div>`).join(""):"<p class='tip'>还没有大便记录</p>";

  // 最近记录
  const recent=[...log].sort((a,b)=>b.t-a.t).slice(0,40);
  $("log").innerHTML=recent.length?recent.map(e=>{
    const a=A(e.a)||{emoji:"❓",name:e.a};
    return `<div class="r"><span>${a.emoji} ${esc(a.name)}${e.v?" · <b>"+esc(e.v)+(e.a==="meal"?"g":"")+"</b>":""}${e.n?"<br><span class='m'>"+esc(e.n)+"</span>":""}</span>
    <span style="white-space:nowrap"><span class="m">${md(e.t)}</span> <button class="g s" data-del="${e.id}">删</button></span></div>`;
  }).join(""):"<p class='tip'>还没有记录，碰一下 NFC 贴片试试吧</p>";
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{if(confirm("删除这条记录？")){log=log.filter(e=>e.id!==b.dataset.del);save();render();}});
  renderLive();renderCharts();
}
$("prev").onclick=()=>{weekOff--;render();};
$("next").onclick=()=>{if(weekOff<0){weekOff++;render();}};
