function mk(id,cfg){if(charts[id])charts[id].destroy();charts[id]=new Chart($(id),cfg);}
function renderCharts(){
  if(typeof Chart==="undefined"){$("chartMsg").textContent="图表库未加载（需要联网）";return;}
  $("chartMsg").textContent="";
  const n=+$("range").value,now=new Date(),nm=Date.now();
  const ds=[...Array(n)].map((_,i)=>new Date(now.getFullYear(),now.getMonth(),now.getDate()-(n-1-i)));
  const labels=ds.map(d=>`${d.getMonth()+1}/${d.getDate()}`);
  const c=crateC(),w=walkC(),goal=goalMs()/36e5;
  const base={responsive:true,animation:false,plugins:{legend:{display:false}}};
  mk("ch1",{data:{labels,datasets:[
    {type:"bar",data:ds.map(d=>+(dayStats(c,d,nm).outMs/36e5).toFixed(2)),backgroundColor:"#e0903a"},
    {type:"line",data:ds.map(()=>goal),borderColor:"#3c9a4a",borderDash:[6,4],pointRadius:0,borderWidth:2}]},options:base});
  const gs=c.gaps.filter(x=>x[1]>=sod(ds[0]));
  mk("ch2",{type:"bar",data:{labels:gs.map(x=>`${new Date(x[1]).getMonth()+1}/${new Date(x[1]).getDate()} ${hm(x[1])}`),
    datasets:[{data:gs.map(x=>+((x[1]-x[0])/36e5).toFixed(2)),backgroundColor:gs.map(x=>gcol(x[1]-x[0]))}]},options:base});
  mk("ch3",{type:"bar",data:{labels,datasets:[{data:ds.map(d=>gramsOf(dayLog("meal",d))||null),backgroundColor:"#6aa6e0"}]},options:base});
  mk("ch4",{type:"bar",data:{labels,datasets:[{data:ds.map(d=>Math.round(dayStats(w,d,nm).outMs/60000)||null),backgroundColor:"#7cc58a"}]},options:base});
  mk("ch5",{type:"line",data:{labels,datasets:[{data:ds.map(d=>{const e=dayLog("weight",d);return e.length?parseFloat(e[e.length-1].v):null;}),borderColor:"#8a5a2b",spanGaps:true,tension:.2}]},options:base});
  $("strip").innerHTML=ds.map(d=>{
    const es=dayLog("poop",d);
    if(!es.length)return `<i title="${ymd(d)} 无记录">${d.getDate()}</i>`;
    const worst=es.reduce((a,b)=>(PRANK[b.v]??0)>(PRANK[a.v]??0)?b:a);
    return `<i style="background:${PC[worst.v]||"#999"}" title="${ymd(d)} ${es.map(e=>e.v).join("、")}">${d.getDate()}</i>`;
  }).join("");
}
$("range").onchange=renderCharts;
window.addEventListener("load",renderCharts);
