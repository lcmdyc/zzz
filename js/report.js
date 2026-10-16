/* ====== 周报 / 月报 ====== */
function periodReport(s,e,title){
  const sm=s.getTime(),em=e.getTime(),nm=Date.now();
  const inP=x=>x.t>=sm&&x.t<em,L2=log.filter(inP);
  const days=[];for(let d=new Date(s);d<e;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1))days.push(d);
  const act=new Set(L2.map(x=>ymd(new Date(x.t))));
  const ad=days.filter(d=>act.has(ymd(d)));
  const lines=[`# ${title}`,`周期：${ymd(s)} ~ ${ymd(new Date(em-1))}`,`有记录的天数：${ad.length} / ${days.length}`,""];
  if(!ad.length){lines.push("该期间没有记录。");return lines.join("\n");}
  const c=crateC(),w=walkC(),g=goalMs();
  const st=ad.map(d=>dayStats(c,d,nm)),ws=ad.map(d=>dayStats(w,d,nm));
  const sum=a=>a.reduce((x,y)=>x+y,0);
  // 笼子
  const outT=sum(st.map(x=>x.outMs));
  const gp=c.gaps.filter(x=>x[1]>=sm&&x[1]<em).map(x=>x[1]-x[0]);
  lines.push("## 🏠 笼子");
  lines.push(`- 日均出笼：${fmtHM(outT/ad.length)}（目标 ${fmtHM(g)}，达标 ${st.filter(x=>g&&x.outMs>=g).length}/${ad.length} 天）`);
  lines.push(`- 出笼总次数：${sum(st.map(x=>x.cnt))}，日均 ${(sum(st.map(x=>x.cnt))/ad.length).toFixed(1)} 次`);
  if(gp.length){
    lines.push(`- 出笼前笼内时长：平均 ${fmtHM(sum(gp)/gp.length)}，最长 ${fmtHM(Math.max(...gp))}，最短 ${fmtHM(Math.min(...gp))}`);
    lines.push(`- 间隔分布（≤${gH()}h🟢 / ≥${rH()}h🔴）：🟢${gp.filter(x=>gcls(x)==="gk").length} 次，🟡${gp.filter(x=>gcls(x)==="gm").length} 次，🔴${gp.filter(x=>gcls(x)==="gb").length} 次`);
  }
  // 遛狗
  lines.push("","## 🚶 遛狗");
  const wc=sum(ws.map(x=>x.cnt)),wm=sum(ws.map(x=>x.outMs));
  lines.push(wc?`- 共 ${wc} 次，累计 ${fmtHM(wm)}，日均 ${fmtHM(wm/ad.length)}，平均每次 ${fmtHM(wm/wc)}`:"- 无遛狗计时记录");
  // 饮食
  lines.push("","## 🍽️ 饮食");
  const ml=L2.filter(x=>x.a==="meal"),tot=gramsOf(L2);
  lines.push(ml.length?`- 喂食 ${ml.length} 次，总量 ${tot}g，日均 ${Math.round(tot/ad.length)}g，平均每餐 ${Math.round(tot/ml.length)}g`:"- 无喂食记录");
  lines.push(`- 零食 ${L2.filter(x=>x.a==="snack").length} 次`);
  L2.filter(x=>x.a==="newfood").forEach(x=>lines.push(`- 新食物/换粮：${ymd(new Date(x.t))} ${x.n}`));
  // 大便
  lines.push("","## 💩 大便");
  const pl=L2.filter(x=>x.a==="poop");
  if(pl.length){
    const cnt={};pl.forEach(x=>cnt[x.v]=(cnt[x.v]||0)+1);
    lines.push(`- 共 ${pl.length} 次：`+Object.entries(cnt).map(([k,v])=>`${k}${v}次`).join("、"));
    pl.filter(x=>x.v!=="正常").forEach(x=>lines.push(`  - ${md(x.t)} ${x.v}｜${x.n}`));
  }else lines.push("- 无记录");
  // 异常
  lines.push("","## ⚠️ 异常事件");
  const al=L2.filter(x=>x.a==="abn");
  if(al.length){
    const cnt={};al.forEach(x=>cnt[x.v]=(cnt[x.v]||0)+1);
    lines.push(`- 共 ${al.length} 次：`+Object.entries(cnt).map(([k,v])=>`${k}${v}次`).join("、"));
    al.sort((x,y)=>x.t-y.t).forEach(x=>lines.push(`  - ${md(x.t)} ${x.v}｜${x.n}`));
  }else lines.push("- 无记录");
  // 体重
  lines.push("","## ⚖️ 体重");
  const wl=L2.filter(x=>x.a==="weight").sort((x,y)=>x.t-y.t);
  lines.push(wl.length?`- ${ymd(new Date(wl[0].t))}：${wl[0].v}kg → ${ymd(new Date(wl[wl.length-1].t))}：${wl[wl.length-1].v}kg（共 ${wl.length} 次称重）`:"- 无记录");
  // 驱虫疫苗
  lines.push("","## 💊 驱虫 / 疫苗状态（截至今天）");
  REM.forEach(r=>{const s2=remStatus(r);lines.push(`- ${r.label}：`+(s2.last?`上次 ${ymd(new Date(s2.last.t))}，下次 ${ymd(s2.due)}（${s2.left<0?"已过期"+(-s2.left)+"天":"还有"+s2.left+"天"}）`:"未记录"));});
  const hl=L2.filter(x=>x.a==="health");
  if(hl.length){lines.push("","## 🩺 健康备注");hl.forEach(x=>lines.push(`- ${md(x.t)} ${x.n}`));}
  return lines.join("\n");
}
function csvOf(list){
  const rows=[["日期","时间","分类","动作","值","备注"]];
  [...list].sort((a,b)=>a.t-b.t).forEach(e=>{const a=A(e.a)||{name:e.a,cat:""};rows.push([ymd(new Date(e.t)),hm(e.t),a.cat,a.name,e.v,e.n]);});
  return "\ufeff"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
}
function dl(name,text,type){const b=new Blob([text],{type});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();}

function showReport(s,e,title,isMonth,fname){
  const txt=periodReport(s,e,title),sm=s.getTime(),em=e.getTime();
  const past=isMonth&&em<=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();
  $("mbox").className="box wide";
  $("mbox").innerHTML=`<h3>${esc(title)}</h3>
    <textarea id="rt" readonly style="width:100%;height:320px;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:13px;line-height:1.5">${esc(txt)}</textarea>
    <div class="row" style="flex-wrap:wrap;justify-content:flex-start">
      <button id="rcopy">复制</button><button id="rdl">下载报告</button><button id="rcsv">下载原始CSV</button>
      ${past?'<button class="g" id="rdel" disabled>🗑 删除该月原始数据</button>':''}<button class="g" id="rclose">关闭</button></div>
    ${past?'<p class="tip">需先下载报告和原始 CSV 才能删除。会保留：内驱/外驱/疫苗/体重/健康备注，以及当月最后一次出笼/进笼和遛狗记录。删除会同步到云端。</p>':''}`;
  $("modal").style.display="flex";
  let dl1=false,dl2=false;const chk=()=>{if(past)$("rdel").disabled=!(dl1&&dl2);};
  $("rclose").onclick=closeModal;
  $("rcopy").onclick=()=>{$("rt").select();(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).catch(()=>document.execCommand("copy"));$("rcopy").textContent="已复制";};
  $("rdl").onclick=()=>{dl(fname+".md",txt,"text/markdown");dl1=true;chk();};
  $("rcsv").onclick=()=>{dl(fname+"-原始数据.csv",csvOf(log.filter(x=>x.t>=sm&&x.t<em)),"text/csv");dl2=true;chk();};
  if(past)$("rdel").onclick=()=>{
    const inR=log.filter(x=>x.t>=sm&&x.t<em);
    const keep=new Set(inR.filter(x=>KEEP.includes(x.a)).map(x=>x.id));
    [["crate_out","crate_in"],["walk_out","walk_in"]].forEach(p=>{const l=inR.filter(x=>p.includes(x.a)).sort((x,y)=>y.t-x.t)[0];if(l)keep.add(l.id);});
    const del=inR.filter(x=>!keep.has(x.id));
    if(!del.length){warnToast("没有可删除的数据");return;}
    if(!confirm(`将删除 ${del.length} 条原始记录（保留 ${keep.size} 条关键记录）。\n云端也会同步删除，确认已下载报告和CSV？`))return;
    const ds=new Set(del.map(x=>x.id));log=log.filter(x=>!ds.has(x.id));save();render();closeModal();showToast(`已删除 ${del.length} 条记录`,false);
  };
}
const weekStart=off=>{const n=new Date(),d=(n.getDay()+6)%7;return new Date(n.getFullYear(),n.getMonth(),n.getDate()-d+off*7);};
[["rw0",0],["rw1",-1]].forEach(([id,off])=>$(id).onclick=()=>{
  const s=weekStart(off),e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+7);
  showReport(s,e,`皂皂周报 ${ymd(s)}`,false,`皂皂周报-${ymd(s)}`);
});
$("rmonth").value=ymd(new Date()).slice(0,7);
$("rm").onclick=()=>{
  const v=$("rmonth").value;if(!v)return;const [y,m]=v.split("-").map(Number);
  showReport(new Date(y,m-1,1),new Date(y,m,1),`皂皂月报 ${v}`,true,`皂皂月报-${v}`);
};

/* ====== NFC 链接 ====== */
const urlRow=(n,u)=>`<div class="url"><b>${n}</b><input readonly value="${esc(u)}"><button class="s" data-copy>复制</button></div>`;
function buildUrls(){
  const base=location.origin+location.pathname;
  let h=urlRow("🔁 出/进笼 切换",`${base}?a=crate`)+urlRow("🔁 遛狗 出门/回家 切换",`${base}?a=walk`);
  ACTIONS.filter(a=>!a.hide).forEach(a=>{
    h+=urlRow(a.emoji+" "+a.name,`${base}?a=${a.id}`);
    if(a.type==="choice")a.opts.forEach(o=>{h+=urlRow("　└ "+o,`${base}?a=${a.id}&v=${encodeURIComponent(o)}`);});
    if(a.type==="meal")a.grams.forEach(g=>{h+=urlRow("　└ "+g+"g",`${base}?a=${a.id}&v=${g}`);});
  });
  $("urls").innerHTML=h;
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>{
    const i=b.previousElementSibling;i.select();
    (navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).catch(()=>document.execCommand("copy"));
    b.textContent="已复制";setTimeout(()=>b.textContent="复制",1200);
  });
}

/* ====== 导出/导入 ====== */
$("expJson").onclick=()=>dl(`zaozao-${ymd(new Date())}.json`,JSON.stringify(log),"application/json");
$("expCsv").onclick=()=>dl(`zaozao-${ymd(new Date())}.csv`,csvOf(log),"text/csv");
$("impBtn").onclick=()=>$("impFile").click();
$("impFile").onchange=e=>{
  const f=e.target.files[0];if(!f)return;
  f.text().then(t=>{
    try{const arr=JSON.parse(t);const ids=new Set(log.map(x=>x.id));let n=0;
      arr.forEach(x=>{if(x&&x.id&&x.a&&x.t&&!ids.has(x.id)){log.push(x);n++;}});
      save();render();alert(`导入完成，新增 ${n} 条`);
    }catch(_){alert("文件格式不正确");}
  });
};
$("clearAll").onclick=()=>{if(confirm("确定清空本机所有记录？（已登录云同步的话，下次同步会把云端对应数据一并删除）建议先导出备份")){log=[];save();render();}};
