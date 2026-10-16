/* ====== 档案与记录项管理 ====== */
const boxEl=()=>$("mbox");
function openBox(html){boxEl().className="box big";boxEl().innerHTML=html;$("modal").style.display="flex";}
const ck=(id,label,on)=>`<label class="ck"><input type="checkbox" id="${id}"${on?" checked":""}> ${label}</label>`;
const fld=(label,inner)=>`<div class="fld"><label>${label}</label>${inner}</div>`;

/* ---------- 档案列表 ---------- */
function openManage(){
  openBox(`<h3>⚙ 档案管理</h3>
    ${cfg.profiles.map(p=>`<div class="mrow">
      <b>${p.emoji} ${esc(p.name)}</b><span class="tip">${p.items.length} 项</span>
      <span class="mbtn">
        <button class="s" data-pi="${p.id}">记录项</button>
        <button class="s g" data-pr="${p.id}">改名</button>
        <button class="s g" data-pd="${p.id}">删除</button>
      </span></div>`).join("")}
    <div class="mrow"><b>＋ 新建档案</b></div>
    <input id="npn" placeholder="档案名称，例如：爸爸">
    <input id="npe" placeholder="图标 emoji（可选）" maxlength="4">
    <div class="row"><button class="g" id="npb">空白档案</button><button id="npm">用「我自己」模板</button></div>
    <div class="row"><button class="g" id="mc">关闭</button></div>`);
  $("mc").onclick=()=>{closeModal();render();};
  const mk2=tpl=>{
    const name=$("npn").value.trim();if(!name){$("npn").focus();return;}
    const p=addProfile(name,$("npe").value.trim(),tpl);setCur(p.id);weekOff=0;openManage();
  };
  $("npb").onclick=()=>mk2("blank");$("npm").onclick=()=>mk2("me");
  boxEl().querySelectorAll("[data-pi]").forEach(b=>b.onclick=()=>openItems(b.dataset.pi));
  boxEl().querySelectorAll("[data-pr]").forEach(b=>b.onclick=()=>{
    const p=cfg.profiles.find(x=>x.id===b.dataset.pr);
    const n=prompt("档案名称",p.name);if(n===null)return;
    const e=prompt("图标 emoji",p.emoji);if(e===null)return;
    if(n.trim())p.name=n.trim();if(e.trim())p.emoji=e.trim();
    saveCfg();openManage();
  });
  boxEl().querySelectorAll("[data-pd]").forEach(b=>b.onclick=()=>{
    const p=cfg.profiles.find(x=>x.id===b.dataset.pd);
    if(cfg.profiles.length<2){warnToast("至少要保留一个档案");return;}
    if(!confirm(`删除档案「${p.name}」？`))return;
    const del=confirm("是否同时删除该档案的所有记录？\n确定 = 一并删除记录\n取消 = 只删档案，保留记录数据");
    if(del){const s=new Set(idsOfProf(p));log=log.filter(e=>!s.has(e.a));save();}
    removeProfile(p.id);setCur(curP().id);openManage();
  });
}

/* ---------- 记录项列表 ---------- */
function openItems(pid){
  const p=cfg.profiles.find(x=>x.id===pid);
  openBox(`<h3>${p.emoji} ${esc(p.name)} · 记录项</h3>
    ${p.items.map((it,i)=>`<div class="mrow">
      <span>${it.emoji} ${esc(it.name)} <span class="tip">${TYPE_NAME[it.type]}</span></span>
      <span class="mbtn">
        <button class="s g" data-up="${i}"${i?"":" disabled"}>↑</button>
        <button class="s g" data-dn="${i}"${i<p.items.length-1?"":" disabled"}>↓</button>
        <button class="s" data-ed="${i}">编辑</button>
        <button class="s g" data-rm="${i}">删</button>
      </span></div>`).join("")||"<p class='tip'>还没有记录项</p>"}
    <div class="mrow"><b>＋ 添加记录项</b></div>
    <select id="nt">${TYPES.map(t=>`<option value="${t[0]}">${t[1]}</option>`).join("")}</select>
    <div class="row"><button class="g" id="mc">返回</button><button id="nadd">添加</button></div>`);
  $("mc").onclick=openManage;
  $("nadd").onclick=()=>openEditor(pid,null,$("nt").value);
  const q=(a,f)=>boxEl().querySelectorAll(`[data-${a}]`).forEach(b=>b.onclick=()=>f(+b.dataset[a]));
  q("up",i=>{[p.items[i-1],p.items[i]]=[p.items[i],p.items[i-1]];saveCfg();openItems(pid);});
  q("dn",i=>{[p.items[i+1],p.items[i]]=[p.items[i],p.items[i+1]];saveCfg();openItems(pid);});
  q("ed",i=>openEditor(pid,p.items[i].id,p.items[i].type));
  q("rm",i=>{
    const it=p.items[i];if(!confirm(`删除记录项「${it.name}」？`))return;
    if(confirm("是否同时删除它已有的记录？\n确定 = 一并删除\n取消 = 保留记录数据")){
      const s=new Set(idsOfItem(it));log=log.filter(e=>!s.has(e.a));save();
    }
    p.items.splice(i,1);saveCfg();openItems(pid);
  });
}

/* ---------- 记录项编辑器 ---------- */
function optRow(o){
  return `<div class="orow"><input class="on" value="${esc(o.n)}" placeholder="名称">
    <input class="oc" type="color" value="${o.c||"#3c9a4a"}">
    <select class="or">${[0,1,2,3,4].map(r=>`<option value="${r}"${(+o.r||0)===r?" selected":""}>严重度${r}</option>`).join("")}</select>
    <button class="s g orm" type="button">×</button></div>`;
}
function openEditor(pid,itemId,type){
  const p=cfg.profiles.find(x=>x.id===pid);
  const isNew=!itemId;
  const it=isNew?newItem(type,p):p.items.find(x=>x.id===itemId);
  const v=(k,d="")=>esc(it[k]??d);
  let h=`<h3>${isNew?"添加":"编辑"}：${TYPE_NAME[type]}</h3>
    ${fld("图标",`<input id="f_emoji" value="${v("emoji")}" maxlength="4">`)}
    ${fld("名称",`<input id="f_name" value="${v("name")}">`)}
    ${fld("分类（月报里的分组名，可留空）",`<input id="f_cat" value="${v("cat")}">`)}`;
  if(type==="tap")h+=fld("每日目标次数（0 = 不设）",`<input id="f_target" type="number" min="0" value="${v("target",0)}">`);
  if(type==="num")h+=fld("单位（如 kg、g、杯）",`<input id="f_unit" value="${v("unit")}">`)
    +fld("快捷数值（逗号分隔，可留空）",`<input id="f_quick" value="${esc((it.quick||[]).join(","))}">`)
    +fld("每日目标次数（0 = 不设）",`<input id="f_target" type="number" min="0" value="${v("target",0)}">`)
    +ck("f_sum","显示当日合计（如每天喂了多少克）",it.sum)+ck("f_chart","画趋势图",it.chart);
  if(type==="choice")h+=`<div class="fld"><label>选项（名称 / 颜色 / 严重度，0 表示正常）</label><div id="opts">${(it.opts||[]).map(optRow).join("")}</div>
      <button class="s g" id="oadd" type="button">＋ 添加选项</button></div>`
    +ck("f_cal","画状态日历、显示状态记录",it.cal)
    +ck("f_abn","红色警示卡片",it.cls==="abn")
    +(p.id==="zz"?ck("f_ctx","记录时自动附带关联信息（上餐时间、喂食量等）",it.ctx):"");
  if(type==="remind")h+=fld("周期（天）",`<input id="f_d" type="number" min="1" value="${v("d",30)}">`);
  if(type==="timer")h+=`<div class="two">`
    +fld("开始按钮文字",`<input id="f_lo" value="${v("lo")}">`)+fld("结束按钮文字",`<input id="f_li" value="${v("li")}">`)
    +fld("开始图标",`<input id="f_eo" value="${v("eo")}" maxlength="4">`)+fld("结束图标",`<input id="f_ei" value="${v("ei")}" maxlength="4">`)
    +fld("进行中的状态文字",`<input id="f_to" value="${v("tOpen")}">`)+fld("空闲时的状态文字",`<input id="f_ts" value="${v("tShut")}">`)
    +`</div>`+fld("每日目标时长（小时，0 = 不设）",`<input id="f_goal" type="number" min="0" step="0.5" value="${v("goal",0)}">`)
    +ck("f_chart","画每日时长图",it.chart)
    +ck("f_gaps","统计「间隔」（上次结束到本次开始，如出笼前笼内）",it.gaps)
    +`<div id="gapbox"${it.gaps?"":" style='display:none'"}>`
    +fld("间隔名称",`<input id="f_gl" value="${v("gapLbl")}">`)
    +`<div class="two">`+fld("绿灯：不超过（小时）",`<input id="f_gg" type="number" min="0" step="0.5" value="${v("gg",3)}">`)
    +fld("红灯：达到（小时）",`<input id="f_rr" type="number" min="0" step="0.5" value="${v("rr",6)}">`)+`</div>`
    +ck("f_gc","画间隔图",it.gchart)+`</div>`;
  h+=ck("f_keep","月报清理时保留此项的原始记录",it.keep);
  h+=`<div class="row"><button class="g" id="mc">取消</button><button id="mok">保存</button></div>`;
  openBox(h);

  const g=id=>$(id);
  $("mc").onclick=()=>openItems(pid);
  if(type==="choice"){
    const bind=()=>boxEl().querySelectorAll(".orm").forEach(b=>b.onclick=()=>b.parentNode.remove());
    bind();
    $("oadd").onclick=()=>{$("opts").insertAdjacentHTML("beforeend",optRow({n:"",c:"#3c9a4a",r:0}));bind();};
  }
  if(type==="timer")g("f_gaps").onchange=()=>g("gapbox").style.display=g("f_gaps").checked?"":"none";

  $("mok").onclick=()=>{
    const name=g("f_name").value.trim();if(!name){g("f_name").focus();return;}
    it.name=name;it.emoji=g("f_emoji").value.trim()||"📝";it.cat=g("f_cat").value.trim()||name;it.keep=g("f_keep").checked;
    if(type==="tap")it.target=Math.max(0,+g("f_target").value||0);
    if(type==="num"){
      it.unit=g("f_unit").value.trim();
      it.quick=g("f_quick").value.split(/[,，\s]+/).map(parseFloat).filter(x=>!isNaN(x));
      it.target=Math.max(0,+g("f_target").value||0);it.sum=g("f_sum").checked;it.chart=g("f_chart").checked;
    }
    if(type==="choice"){
      const opts=[...boxEl().querySelectorAll(".orow")].map(r=>({n:r.querySelector(".on").value.trim(),c:r.querySelector(".oc").value,r:+r.querySelector(".or").value})).filter(o=>o.n);
      if(!opts.length){warnToast("至少要有一个选项");return;}
      if(new Set(opts.map(o=>o.n)).size<opts.length){warnToast("选项名称不能重复");return;}
      it.opts=opts;it.cal=g("f_cal").checked;
      if(g("f_abn").checked)it.cls="abn";else delete it.cls;
      if(g("f_ctx"))it.ctx=g("f_ctx").checked;
    }
    if(type==="remind")it.d=Math.max(1,+g("f_d").value||1);
    if(type==="timer"){
      it.lo=g("f_lo").value.trim()||"开始";it.li=g("f_li").value.trim()||"结束";
      it.eo=g("f_eo").value.trim();it.ei=g("f_ei").value.trim();
      it.tOpen=g("f_to").value.trim()||"进行中";it.tShut=g("f_ts").value.trim()||"空闲";
      it.goal=Math.max(0,+g("f_goal").value||0);it.chart=g("f_chart").checked;
      it.gaps=g("f_gaps").checked;it.gapLbl=g("f_gl").value.trim()||"间隔";
      it.gg=+g("f_gg").value||0;it.rr=+g("f_rr").value||0;it.gchart=g("f_gc").checked;
    }
    if(isNew)p.items.push(it);
    saveCfg();render();openItems(pid);
  };
}
