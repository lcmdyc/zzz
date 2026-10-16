function mk(id,cfg){
  const el=$(id);if(!el)return;
  if(charts[id])charts[id].destroy();
  charts[id]=new Chart(el,cfg);
}
function renderCharts(){
  const host=$("chartHost");
  if(typeof Chart==="undefined"){$("chartMsg").textContent="图表库未加载（需要联网）";return;}
  $("chartMsg").textContent="";
  // 销毁旧图表
  Object.keys(charts).forEach(k=>{try{charts[k].destroy();}catch(_){}delete charts[k];});

  const P=curP(),n=+$("range").value,now=new Date(),nm=Date.now();
  const ds=[...Array(n)].map((_,i)=>new Date(now.getFullYear(),now.getMonth(),now.getDate()-(n-1-i)));
  const labels=ds.map(d=>`${d.getMonth()+1}/${d.getDate()}`);
  const base={responsive:true,animation:false,plugins:{legend:{display:false}}};

  // 先收集要画的图，生成容器，再统一绘制
  const jobs=[];let html="";
  let k=0;
  const add=(title,draw)=>{const id="cv"+(k++);html+=`<div class="chbox"><h3>${title}</h3><canvas id="${id}"></canvas></div>`;jobs.push(()=>draw(id));};

  P.items.forEach(it=>{
    if(it.type==="timer"){
      const c=tcalc(it);
      if(it.chart){
        const goal=tgoal(it)/36e5;
        add(`${it.emoji} 每日${esc(it.name)}时长（小时）`,id=>{
          const sets=[{type:"bar",data:ds.map(d=>+(dayStats(c,d,nm).outMs/36e5).toFixed(2)),backgroundColor:"#e0903a"}];
          if(goal)sets.push({type:"line",data:ds.map(()=>goal),borderColor:"#3c9a4a",borderDash:[6,4],pointRadius:0,borderWidth:2});
          mk(id,{data:{labels,datasets:sets},options:base});
        });
      }
      if(it.gaps&&it.gchart){
        const gs=c.gaps.filter(x=>x[1]>=sod(ds[0]));
        add(`${it.emoji} ${esc(it.gapLbl||"间隔")}（小时，红绿灯）`,id=>{
          mk(id,{type:"bar",data:{labels:gs.map(x=>`${new Date(x[1]).getMonth()+1}/${new Date(x[1]).getDate()} ${hm(x[1])}`),
            datasets:[{data:gs.map(x=>+((x[1]-x[0])/36e5).toFixed(2)),backgroundColor:gs.map(x=>tcol(it,x[1]-x[0]))}]},options:base});
        });
      }
    }else if(it.type==="num"&&it.chart){
      const u=it.unit?`（${esc(it.unit)}）`:"";
      if(it.sum){
        add(`${it.emoji} 每日${esc(it.name)}合计${u}`,id=>{
          mk(id,{type:"bar",data:{labels,datasets:[{data:ds.map(d=>sumOf(it.id,dayLog(it.id,d))||null),backgroundColor:"#6aa6e0"}]},options:base});
        });
      }else{
        add(`${it.emoji} ${esc(it.name)}趋势${u}`,id=>{
          mk(id,{type:"line",data:{labels,datasets:[{data:ds.map(d=>{const e=dayLog(it.id,d);return e.length?parseFloat(e[e.length-1].v):null;}),borderColor:"#8a5a2b",spanGaps:true,tension:.2}]},options:base});
        });
      }
    }else if(it.type==="choice"&&it.cal){
      html+=`<div class="chbox"><h3>${it.emoji} ${esc(it.name)}日历（当天最严重状态）</h3><div class="strip">`+
        ds.map(d=>{
          const es=dayLog(it.id,d);
          if(!es.length)return `<i title="${ymd(d)} 无记录">${d.getDate()}</i>`;
          const worst=es.reduce((a,b)=>optRank(it,b.v)>optRank(it,a.v)?b:a);
          return `<i style="background:${optColor(it,worst.v)}" title="${ymd(d)} ${esc(es.map(e=>e.v).join("、"))}">${d.getDate()}</i>`;
        }).join("")+`</div></div>`;
    }
  });

  host.innerHTML=html||"<p class='tip'>当前档案没有开启图表的记录项，可在「⚙ 管理」里打开</p>";
  jobs.forEach(f=>f());
}
$("range").onchange=renderCharts;
window.addEventListener("load",renderCharts);
