/* ====== 档案标签栏 ====== */
function renderTabs(){
  $("tabs").innerHTML=cfg.profiles.map(p=>`<button class="tab${p.id===curId?" on":""}" data-p="${p.id}">${p.emoji} ${esc(p.name)}</button>`).join("")
    +`<button class="tab tab-mgr" data-mgr="1">⚙ 管理</button>`;
}
$("tabs").onclick=e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.mgr){openManage();return;}
  if(b.dataset.p&&b.dataset.p!==curId){setCur(b.dataset.p);weekOff=0;render();}
};

/* ====== 计时卡片（按当前档案的计时项生成） ====== */
const timers=()=>curP().items.filter(it=>it.type==="timer");
function renderTimers(){
  $("timers").innerHTML=timers().map(it=>`<div class="card in" data-t="${it.id}">
    <div class="tl-head">${it.emoji} ${esc(it.name)}</div>
    <div class="tl-st"></div><div class="tl-since tip"></div>
    <div class="tl-tm">--:--:--</div><div class="tl-warn"></div>
    <button class="tl-btn" data-tt="${it.id}"></button>
    <div class="tl-stats">
      <div><b class="ts1"></b><span>今日时长</span></div>
      <div><b class="ts2"></b><span>今日次数</span></div>
      ${it.gaps?`<div><b class="ts3"></b><span>平均${esc(it.gapLbl||"间隔")}</span></div><div><b class="ts4"></b><span>最长${esc(it.gapLbl||"间隔")}</span></div>`:""}
    </div>
    <div class="tl-bar"><i class="tbar"></i></div><div class="tip tgoal"></div>
    ${it.gaps?`<div class="tl-gaps"></div>`:""}
  </div>`).join("");
}
$("timers").onclick=e=>{const b=e.target.closest("[data-tt]");if(b)trigger(b.dataset.tt);};

/* ====== 实时面板 ====== */
function renderLive(){
  const now=Date.now();
  timers().forEach(it=>{
    const el=document.querySelector(`[data-t="${it.id}"]`);if(!el)return;
    const q=s=>el.querySelector(s);
    const c=tcalc(it),isOut=c.open!==null,g=tgoal(it);
    const lastOut=c.out.length?c.out[c.out.length-1]:null;
    el.className="card"+(isOut?"":" in");
    q(".tl-warn").textContent="";
    if(isOut){
      q(".tl-st").textContent=it.tOpen||"进行中";
      q(".tl-since").textContent=`${it.lo}于 ${md(c.open)}`;
      q(".tl-tm").textContent=fmtHMS(now-c.open);q(".tl-tm").style.color="#3c9a4a";
      q(".tl-btn").textContent=`${it.ei||""} ${it.li}（记录）`;
    }else if(it.gaps&&c.lastIn!==null){
      const d=now-c.lastIn;
      q(".tl-st").textContent=temo(it,d)+" "+(it.tShut||"空闲");
      q(".tl-since").textContent=`${it.li}于 ${md(c.lastIn)}`;
      q(".tl-tm").textContent=fmtHMS(d);q(".tl-tm").style.color=tcol(it,d);
      q(".tl-btn").textContent=`${it.eo||""} ${it.lo}（记录）`;
      if(tcls(it,d)==="gb")q(".tl-warn").innerHTML=`<b style="color:#d9534f">已超过 ${+it.rr||0} 小时</b>`;
    }else{
      q(".tl-st").textContent=it.tShut||"空闲";
      q(".tl-since").textContent=lastOut?`上次 ${md(lastOut[0])}，${fmtHM(lastOut[1]-lastOut[0])}`:"暂无记录，点下方按钮开始";
      q(".tl-tm").textContent="--:--:--";q(".tl-tm").style.color="#999";
      q(".tl-btn").textContent=`${it.eo||""} ${it.lo}（记录）`;
    }
    const s=dayStats(c,new Date(),now);
    q(".ts1").textContent=fmtHM(s.outMs);q(".ts2").textContent=s.cnt+" 次";
    if(it.gaps){
      q(".ts3").innerHTML=s.gN?`<span class="bd ${tcls(it,s.gAvg)}">${fmtHM(s.gAvg)}</span>`:"-";
      q(".ts4").innerHTML=s.gN?`<span class="bd ${tcls(it,s.gMax)}">${fmtHM(s.gMax)}</span>`:"-";
      const tg=c.gaps.filter(x=>x[1]>=sod(new Date()));
      q(".tl-gaps").innerHTML=tg.length?tg.map(x=>`<span class="bd ${tcls(it,x[1]-x[0])}">${hm(x[1])} ${esc(it.lo)} · ${esc(it.gapLbl||"间隔")} ${fmtHM(x[1]-x[0])}</span>`).join(""):'<span class="tip">今天还没有可计算的间隔</span>';
    }
    q(".tbar").style.width=(g?Math.min(100,s.outMs/g*100):0)+"%";
    q(".tgoal").textContent=g?`今日目标 ${fmtHM(g)}，已完成 ${Math.min(100,Math.round(s.outMs/g*100))}%`:"未设置每日目标";
  });
}
setInterval(renderLive,1000);

/* ====== 记录 ====== */
function record(a,v,n,t){
  t=t||Date.now();const act=A(a);if(!act)return;
  const x=IDX[a],pf=x?x.p:null;
  let note=n||"";
  if(act.ctx&&pf&&pf.id==="zz"){const cx=ctxText(a,t);note=[cx,note].filter(Boolean).join(" ｜ ");}
  const e={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),a,t,v:v||"",n:note};
  log.push(e);lastAdded=e.id;
  let extra="";
  if(x&&x.it.type==="timer"){
    const it=x.it,c=tcalc(it);
    if(x.role==="out"&&it.gaps){const g=c.gaps.find(y=>y[1]===t);if(g)extra=`，${temo(it,g[1]-g[0])} ${it.gapLbl||"间隔"} ${fmtHM(g[1]-g[0])}`;}
    if(x.role==="in"){const o=c.out.find(y=>y[1]===t);if(o)extra=`，本次 ${fmtHM(o[1]-o[0])}`;}
  }
  save();render();
  const unit=act.type==="num"?(act.unit||""):"";
  showToast(`✅ 已记录：${act.emoji} ${act.name}${v?"（"+v+unit+"）":""} ${hm(t)}${extra}`,true);
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
  const act=A(a);if(!act)return;let val="";
  const x=IDX[a],zz=x&&x.p.id==="zz";
  $("mbox").className="box";
  let h=`<h3>${act.emoji} ${esc(act.name)}</h3>`;
  if(act.type==="num"){
    if((act.quick||[]).length)h+=`<div class="opts">${act.quick.map(g=>`<button data-g="${g}">${g}${esc(act.unit||"")}</button>`).join("")}</div><div class="tip">点数值直接记录，或输入其他数值：</div>`;
    h+=`<input id="mv" type="number" step="0.1" inputmode="decimal" placeholder="输入数值${act.unit?"（"+esc(act.unit)+"）":""}">`;
  }
  if(act.type==="choice")h+=`<div class="opts">${optNames(act).map(o=>`<button data-o="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  h+=`<input id="mn" type="text" placeholder="${act.type==="note"?"备注内容":"备注（可选）"}">`;
  if(act.ctx&&zz)h+=`<p class="tip">会自动附带：距上餐时间、前24小时喂食量等关联信息</p>`;
  h+=`<div class="row"><button class="g" id="mc">取消</button><button id="mok">记录</button></div>`;
  $("mbox").innerHTML=h;$("modal").style.display="flex";
  $("mbox").querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{closeModal();record(a,b.dataset.g,$("mn").value.trim());});
  $("mbox").querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{val=b.dataset.o;$("mbox").querySelectorAll("[data-o]").forEach(y=>y.classList.toggle("sel",y===b));});
  $("mc").onclick=closeModal;
  $("mok").onclick=()=>{
    if(act.type==="num"){val=$("mv").value;if(!val){$("mv").focus();return;}}
    if(act.type==="choice"&&!val){warnToast("请先选一个选项");return;}
    const n=$("mn").value.trim();
    if(act.type==="note"&&!n){$("mn").focus();return;}
    closeModal();record(a,val,n);
  };
}

/* 补录（当前档案的所有记录项） */
$("backfill").onclick=()=>{
  const d=new Date();const iso=`${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const opts=[];
  curP().items.forEach(it=>{
    if(it.type==="timer"){opts.push([it.id+"_out",`${it.eo||it.emoji} ${it.lo}`],[it.id+"_in",`${it.ei||it.emoji} ${it.li}`]);}
    else opts.push([it.id,`${it.emoji} ${it.name}`]);
  });
  $("mbox").className="box";
  $("mbox").innerHTML=`<h3>⏱ 补录</h3>
    <select id="bs">${opts.map(o=>`<option value="${o[0]}">${esc(o[1])}</option>`).join("")}</select>
    <input id="bv" placeholder="值（选填：数值/状态选项）">
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

/* ====== 计时项的开始/结束切换 ====== */
function toggleAction(a){
  const x=IDX[a];if(!x)return;
  const it=x.it,o=it.id+"_out",i=it.id+"_in",c=calc(o,i);
  if(x.role==="main")a=c.open!==null?i:o;
  if(a===o&&c.open!==null){warnToast(`「${it.name}」已在进行中（${md(c.open)}）。如漏扫，请用「补录」`);return;}
  if(a===i&&c.open===null){
    if(!it.gaps){warnToast(`当前没有进行中的「${it.name}」。如漏扫了开始，请用「补录」`);return;}
    if(c.lastIn!==null){warnToast(`已经「${it.li}」了（${md(c.lastIn)}）。如漏扫了「${it.lo}」，请用「补录」`);return;}
  }
  record(a);
}
function trigger(a){
  if(isTimer(a))return toggleAction(a);
  const act=A(a);if(!act)return;
  (act.type==="tap"||act.type==="remind")?record(a):openModal(a);
}

/* ====== 到期提醒 ====== */
function renderRem(){
  const rs=curP().items.filter(it=>it.type==="remind");
  $("rem").style.display=rs.length?"":"none";
  $("rem").innerHTML=rs.map(r=>{
    const s=remStatus(r);let cls="gy",txt="未记录";
    if(s.last){cls=s.left<0?"gb":(s.left<=7?"gm":"gk");txt=s.left<0?`已过期 ${-s.left} 天`:(s.left===0?"今天到期":`还有 ${s.left} 天`);}
    return `<div class="rem"><span class="nm">${r.emoji} ${esc(r.name)}</span><span class="bd ${cls}">${txt}</span>
      <span class="inf">${s.last?`上次 ${ymd(new Date(s.last.t))}，下次 ${ymd(s.due)}`:"点右侧按钮记录第一次"}</span>
      <span style="font-size:12px;color:#888">周期<input type="number" min="1" value="${s.days}" data-iv="${r.id}">天</span>
      <button class="s" data-rec="${r.id}">已完成</button></div>`;
  }).join("");
  document.querySelectorAll("[data-iv]").forEach(i=>i.onchange=()=>{const it=IDX[i.dataset.iv].it;it.d=Math.max(1,+i.value||1);saveCfg();renderRem();});
  document.querySelectorAll("[data-rec]").forEach(b=>b.onclick=()=>record(b.dataset.rec));
}

/* ====== 页面渲染 ====== */
function render(){
  const now=new Date();$("today").textContent=`${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日`;
  const P=curP(),td=ymd(now);
  const vis=P.items.filter(it=>it.type!=="timer"&&it.type!=="remind");
  renderTabs();renderTimers();renderRem();
  $("cards").innerHTML=vis.map(a=>{
    const mine=log.filter(e=>e.a===a.id);
    const todays=mine.filter(e=>ymd(new Date(e.t))===td);
    const last=mine.length?mine.reduce((x,y)=>y.t>x.t?y:x):null;
    const tgt=+a.target||0,ok=tgt&&todays.length>=tgt;
    const unit=a.type==="num"?(a.unit||""):"";
    let cnt=tgt?`${todays.length}/${tgt}`:`今日 ${todays.length} 次`;
    if(a.type==="num"&&a.sum)cnt+=` · ${sumOf(a.id,todays)}${unit}`;
    return `<div class="a ${ok?"ok":""} ${a.cls||""}" data-a="${a.id}">
      <div class="t">${a.emoji} ${esc(a.name)}</div><div class="c">${cnt}</div>
      <div class="l">${last?"上次 "+md(last.t)+(last.v?" · "+esc(last.v)+unit:""):"暂无记录"}</div></div>`;
  }).join("")||"<p class='tip'>这个档案还没有记录项，点上方「⚙ 管理」添加</p>";
  document.querySelectorAll(".a").forEach(el=>el.onclick=()=>trigger(el.dataset.a));

  // 周表
  const day=(now.getDay()+6)%7;
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()-day+weekOff*7);
  const ds=[...Array(7)].map((_,i)=>new Date(start.getFullYear(),start.getMonth(),start.getDate()+i));
  const names=["一","二","三","四","五","六","日"];
  $("wlabel").textContent=`${ymd(ds[0])} ~ ${ymd(ds[6])}${weekOff===0?"（本周）":""}`;
  let h="<tr><th>项目</th>"+ds.map((d,i)=>`<th>周${names[i]}<br><small>${d.getMonth()+1}/${d.getDate()}</small></th>`).join("")+"</tr>";
  const nm=Date.now();
  timers().forEach(it=>{
    const c=tcalc(it),g=tgoal(it),st=ds.map(d=>dayStats(c,d,nm));
    h+=`<tr><td class="n"><b>${it.emoji} ${esc(it.name)}时长</b></td>`+st.map(s=>`<td class="${s.outMs?(g?(s.outMs>=g?"g":"p"):"g"):""}">${s.outMs?fmtHM(s.outMs)+(!it.gaps&&s.cnt>1?"<br><small>"+s.cnt+"次</small>":""):""}</td>`).join("")+"</tr>";
    if(it.gaps){
      const L=esc(it.gapLbl||"间隔");
      h+=`<tr><td class="n">　${esc(it.lo)}次数</td>`+st.map(s=>`<td>${s.cnt||""}</td>`).join("")+"</tr>";
      h+=`<tr><td class="n">　平均${L}</td>`+st.map(s=>`<td class="${s.gN?tcls(it,s.gAvg):""}">${s.gN?fmtHM(s.gAvg):""}</td>`).join("")+"</tr>";
      h+=`<tr><td class="n">　最长${L}</td>`+st.map(s=>`<td class="${s.gN?tcls(it,s.gMax):""}">${s.gN?fmtHM(s.gMax):""}</td>`).join("")+"</tr>";
    }
  });
  vis.forEach(a=>{
    h+=`<tr><td class="n">${a.emoji} ${esc(a.name)}</td>`;
    const tgt=+a.target||0,unit=a.type==="num"?(a.unit||""):"";
    ds.forEach(d=>{
      const es=dayLog(a.id,d);let cls="",txt="",sty="";
      if(es.length){
        const last=es[es.length-1];
        if(a.type==="num"&&a.sum){txt=(tgt?`${es.length}/${tgt}`:`${es.length}次`)+`<br><small>${sumOf(a.id,es)}${esc(unit)}</small>`;cls=tgt?(es.length>=tgt?"g":"p"):"g";}
        else if(a.type==="num"){txt=esc(last.v);cls="g";}
        else if(a.type==="choice"){txt=esc(last.v)+(es.length>1?"×"+es.length:"");if(a.cls==="abn")cls="bad";else sty=`color:${optColor(a,last.v)};font-weight:700`;}
        else{txt=tgt?`${es.length}/${tgt}`:"✓"+(es.length>1?es.length:"");cls=tgt?(es.length>=tgt?"g":"p"):"g";}
      }
      h+=`<td class="${cls}" style="${sty}">${txt}</td>`;
    });
    h+="</tr>";
  });
  const tg=vis.filter(a=>+a.target);
  if(tg.length)h+="<tr><td class='n'><b>目标完成</b></td>"+ds.map(d=>`<td><b>${tg.filter(a=>dayLog(a.id,d).length>=+a.target).length}/${tg.length}</b></td>`).join("")+"</tr>";
  $("week").innerHTML=h;

  // 状态记录（开启了「状态日历」的状态项）
  const sts=P.items.filter(it=>it.type==="choice"&&it.cal);
  $("states").innerHTML=sts.map(it=>{
    const list=log.filter(e=>e.a===it.id).sort((x,y)=>y.t-x.t);
    const p7=list.filter(e=>e.t>Date.now()-7*864e5);
    const sum=p7.length?`近7天共 ${p7.length} 次，非正常 ${p7.filter(e=>optRank(it,e.v)>0).length} 次`:"近7天暂无记录";
    return `<div class="sbox"><h3>${it.emoji} ${esc(it.name)}</h3><div class="tip">${sum}</div>`+
      (list.length?list.slice(0,12).map(e=>`<div class="pi"><span class="bd" style="background:${optColor(it,e.v)};color:#fff">${esc(e.v||"?")}</span><b>${md(e.t)}</b><div class="tip" style="margin-top:2px">${esc(e.n)||"无备注"}</div></div>`).join(""):"<p class='tip'>还没有记录</p>")+`</div>`;
  }).join("");
  $("states").style.display=sts.length?"":"none";

  // 最近记录（当前档案）
  const recent=profLog(P).sort((a,b)=>b.t-a.t).slice(0,40);
  $("log").innerHTML=recent.length?recent.map(e=>{
    const a=A(e.a)||{emoji:"❓",name:e.a},unit=a.type==="num"?(a.unit||""):"";
    return `<div class="r"><span>${a.emoji} ${esc(a.name)}${e.v?" · <b>"+esc(e.v)+unit+"</b>":""}${e.n?"<br><span class='m'>"+esc(e.n)+"</span>":""}</span>
    <span style="white-space:nowrap"><span class="m">${md(e.t)}</span> <button class="g s" data-del="${e.id}">删</button></span></div>`;
  }).join(""):"<p class='tip'>还没有记录</p>";
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=()=>{if(confirm("删除这条记录？")){log=log.filter(e=>e.id!==b.dataset.del);save();render();}});
  renderLive();renderCharts();
}
$("prev").onclick=()=>{weekOff--;render();};
$("next").onclick=()=>{if(weekOff<0){weekOff++;render();}};
