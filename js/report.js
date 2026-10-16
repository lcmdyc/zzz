/* ====== 周报 / 月报（当前档案） ====== */
function periodReport(s,e,title){
  const P=curP(),sm=s.getTime(),em=e.getTime(),nm=Date.now();
  const L2=profLog(P).filter(x=>x.t>=sm&&x.t<em);
  const days=[];for(let d=new Date(s);d<e;d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+1))days.push(d);
  const act=new Set(L2.map(x=>ymd(new Date(x.t))));
  const ad=days.filter(d=>act.has(ymd(d)));
  const lines=[`# ${title}`,`周期：${ymd(s)} ~ ${ymd(new Date(em-1))}`,`有记录的天数：${ad.length} / ${days.length}`,""];
  const reminds=P.items.filter(it=>it.type==="remind");
  if(!ad.length&&!reminds.length){lines.push("该期间没有记录。");return lines.join("\n");}
  const sum=a=>a.reduce((x,y)=>x+y,0);
  const tally=list=>{const c={};list.forEach(x=>c[x.v]=(c[x.v]||0)+1);return Object.entries(c).map(([k,v])=>`${k}${v}次`).join("、");};
  if(!ad.length)lines.push("该期间没有记录。","");
  else P.items.forEach(it=>{
    const mine=L2.filter(x=>x.a===it.id);
    if(it.type==="timer"){
      lines.push(`## ${it.emoji} ${it.name}`);
      const c=tcalc(it),g=tgoal(it);
      const st=ad.map(d=>dayStats(c,d,nm));
      const cnt=sum(st.map(x=>x.cnt)),tot=sum(st.map(x=>x.outMs));
      if(!cnt){lines.push("- 无计时记录","");return;}
      lines.push(`- 日均时长：${fmtHM(tot/ad.length)}`+(g?`（目标 ${fmtHM(g)}，达标 ${st.filter(x=>x.outMs>=g).length}/${ad.length} 天）`:""));
      lines.push(`- 共 ${cnt} 次，累计 ${fmtHM(tot)}，日均 ${(cnt/ad.length).toFixed(1)} 次，平均每次 ${fmtHM(tot/cnt)}`);
      if(it.gaps){
        const gp=c.gaps.filter(x=>x[1]>=sm&&x[1]<em).map(x=>x[1]-x[0]);
        if(gp.length){
          lines.push(`- ${it.gapLbl||"间隔"}：平均 ${fmtHM(sum(gp)/gp.length)}，最长 ${fmtHM(Math.max(...gp))}，最短 ${fmtHM(Math.min(...gp))}`);
          lines.push(`- 间隔分布（≤${it.gg}h🟢 / ≥${it.rr}h🔴）：🟢${gp.filter(x=>tcls(it,x)==="gk").length} 次，🟡${gp.filter(x=>tcls(it,x)==="gm").length} 次，🔴${gp.filter(x=>tcls(it,x)==="gb").length} 次`);
        }
      }
      lines.push("");
    }else if(it.type==="tap"){
      lines.push(`## ${it.emoji} ${it.name}`);
      const t=+it.target||0;
      lines.push(`- 共 ${mine.length} 次`+(t?`，每日目标 ${t} 次，达标 ${ad.filter(d=>dayLog(it.id,d).length>=t).length}/${ad.length} 天`:""),"");
    }else if(it.type==="num"){
      lines.push(`## ${it.emoji} ${it.name}`);
      const u=it.unit||"";
      if(!mine.length)lines.push("- 无记录");
      else if(it.sum){
        const tot=sumOf(it.id,mine);
        lines.push(`- ${mine.length} 次，总量 ${tot}${u}，日均 ${Math.round(tot/ad.length)}${u}，平均每次 ${Math.round(tot/mine.length)}${u}`);
      }else{
        const l=[...mine].sort((x,y)=>x.t-y.t),a=l[0],b=l[l.length-1];
        lines.push(`- ${ymd(new Date(a.t))}：${a.v}${u} → ${ymd(new Date(b.t))}：${b.v}${u}（共 ${l.length} 次）`);
      }
      lines.push("");
    }else if(it.type==="choice"){
      lines.push(`## ${it.emoji} ${it.name}`);
      if(mine.length){
        lines.push(`- 共 ${mine.length} 次：`+tally(mine));
        mine.filter(x=>optRank(it,x.v)>0).sort((x,y)=>x.t-y.t).forEach(x=>lines.push(`  - ${md(x.t)} ${x.v}｜${x.n}`));
      }else lines.push("- 无记录");
      lines.push("");
    }else if(it.type==="note"){
      if(!mine.length)return;
      lines.push(`## ${it.emoji} ${it.name}`);
      mine.sort((x,y)=>x.t-y.t).forEach(x=>lines.push(`- ${md(x.t)} ${x.n}`));
      lines.push("");
    }
  });
  if(reminds.length){
    lines.push("## 💊 周期提醒状态（截至今天）");
    reminds.forEach(r=>{const s2=remStatus(r);lines.push(`- ${r.name}：`+(s2.last?`上次 ${ymd(new Date(s2.last.t))}，下次 ${ymd(s2.due)}（${s2.left<0?"已过期"+(-s2.left)+"天":"还有"+s2.left+"天"}）`:"未记录"));});
  }
  return lines.join("\n");
}
function csvOf(list){
  const rows=[["日期","时间","分类","动作","值","备注"]];
  [...list].sort((a,b)=>a.t-b.t).forEach(e=>{const a=A(e.a)||{name:e.a,cat:""};rows.push([ymd(new Date(e.t)),hm(e.t),a.cat||"",a.name,e.v,e.n]);});
  return "\ufeff"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
}
function dl(name,text,type){const b=new Blob([text],{type});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();}

function showReport(s,e,title,isMonth,fname){
  const P=curP(),txt=periodReport(s,e,title),sm=s.getTime(),em=e.getTime();
  const past=isMonth&&em<=new Date(new Date().getFullYear(),new Date().getMonth(),1).getTime();
  const inRange=()=>profLog(P).filter(x=>x.t>=sm&&x.t<em);
  $("mbox").className="box wide";
  $("mbox").innerHTML=`<h3>${esc(title)}</h3>
    <textarea id="rt" readonly style="width:100%;height:320px;border:1px solid #ddd;border-radius:8px;padding:8px;font-size:13px;line-height:1.5">${esc(txt)}</textarea>
    <div class="row" style="flex-wrap:wrap;justify-content:flex-start">
      <button id="rcopy">复制</button><button id="rdl">下载报告</button><button id="rcsv">下载原始CSV</button>
      ${past?'<button class="g" id="rdel" disabled>🗑 删除该月原始数据</button>':''}<button class="g" id="rclose">关闭</button></div>
    ${past?'<p class="tip">需先下载报告和原始 CSV 才能删除。只删除当前档案的数据。会保留：已勾选「清理时保留」的记录项，以及每个计时项当月最后一条记录。删除会同步到云端。</p>':''}`;
  $("modal").style.display="flex";
  let dl1=false,dl2=false;const chk=()=>{if(past)$("rdel").disabled=!(dl1&&dl2);};
  $("rclose").onclick=closeModal;
  $("rcopy").onclick=()=>{$("rt").select();(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).catch(()=>document.execCommand("copy"));$("rcopy").textContent="已复制";};
  $("rdl").onclick=()=>{dl(fname+".md",txt,"text/markdown");dl1=true;chk();};
  $("rcsv").onclick=()=>{dl(fname+"-原始数据.csv",csvOf(inRange()),"text/csv");dl2=true;chk();};
  if(past)$("rdel").onclick=()=>{
    const inR=inRange(),keep=new Set();
    P.items.forEach(it=>{
      if(it.type==="timer"){
        const ids=[it.id+"_out",it.id+"_in"];
        const l=inR.filter(x=>ids.includes(x.a)).sort((x,y)=>y.t-x.t)[0];
        if(l)keep.add(l.id);
      }else if(it.keep)inR.filter(x=>x.a===it.id).forEach(x=>keep.add(x.id));
    });
    const del=inR.filter(x=>!keep.has(x.id));
    if(!del.length){warnToast("没有可删除的数据");return;}
    if(!confirm(`将删除「${P.name}」的 ${del.length} 条原始记录（保留 ${keep.size} 条关键记录）。\n云端也会同步删除，确认已下载报告和CSV？`))return;
    const ds=new Set(del.map(x=>x.id));log=log.filter(x=>!ds.has(x.id));save();render();closeModal();showToast(`已删除 ${del.length} 条记录`,false);
  };
}
const weekStart=off=>{const n=new Date(),d=(n.getDay()+6)%7;return new Date(n.getFullYear(),n.getMonth(),n.getDate()-d+off*7);};
[["rw0",0],["rw1",-1]].forEach(([id,off])=>$(id).onclick=()=>{
  const s=weekStart(off),e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+7),n=curP().name;
  showReport(s,e,`${n}周报 ${ymd(s)}`,false,`${n}周报-${ymd(s)}`);
});
$("rmonth").value=ymd(new Date()).slice(0,7);
$("rm").onclick=()=>{
  const v=$("rmonth").value;if(!v)return;const [y,m]=v.split("-").map(Number),n=curP().name;
  showReport(new Date(y,m-1,1),new Date(y,m,1),`${n}月报 ${v}`,true,`${n}月报-${v}`);
};

/* ====== NFC 链接（所有档案） ====== */
const urlRow=(n,u)=>`<div class="url"><b>${n}</b><input readonly value="${esc(u)}"><button class="s" data-copy>复制</button></div>`;
function buildUrls(){
  const base=location.origin+location.pathname;
  let h="";
  cfg.profiles.forEach(p=>{
    h+=`<h4 style="margin:12px 0 4px">${p.emoji} ${esc(p.name)}</h4>`;
    p.items.forEach(it=>{
      if(it.type==="timer"){
        h+=urlRow(`🔁 ${it.emoji} ${esc(it.name)}（${esc(it.lo)}/${esc(it.li)} 切换）`,`${base}?a=${it.id}`);
        return;
      }
      h+=urlRow(it.emoji+" "+esc(it.name),`${base}?a=${it.id}`);
      if(it.type==="choice")optNames(it).forEach(o=>{h+=urlRow("　└ "+esc(o),`${base}?a=${it.id}&v=${encodeURIComponent(o)}`);});
      if(it.type==="num")(it.quick||[]).forEach(g=>{h+=urlRow("　└ "+g+(it.unit||""),`${base}?a=${it.id}&v=${g}`);});
    });
  });
  $("urls").innerHTML=h;
  document.querySelectorAll("[data-copy]").forEach(b=>b.onclick=()=>{
    const i=b.previousElementSibling;i.select();
    (navigator.clipboard?navigator.clipboard.writeText(i.value):Promise.reject()).catch(()=>document.execCommand("copy"));
    b.textContent="已复制";setTimeout(()=>b.textContent="复制",1200);
  });
}

/* ====== 导出/导入（全部记录） ====== */
$("expJson").onclick=()=>dl(`records-${ymd(new Date())}.json`,JSON.stringify(log),"application/json");
$("expCsv").onclick=()=>dl(`records-${ymd(new Date())}.csv`,csvOf(log),"text/csv");
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
$("clearAll").onclick=()=>{if(confirm("确定清空本机所有档案的记录？（已登录云同步的话，下次同步会把云端对应数据一并删除）建议先导出备份")){log=[];save();render();}};
