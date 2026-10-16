/* ====== NFC 扫描处理 ====== */
function handleScan(){
  const p=new URLSearchParams(location.search);const a=p.get("a");
  if(!a)return;
  history.replaceState(null,"",location.pathname);
  if(TOG.includes(a)){
    const key=a.startsWith("crate")?"crate":"walk";
    if(log.some(e=>e.a.startsWith(key+"_")&&Date.now()-e.t<20000)){warnToast("刚刚已记录过，已忽略重复扫描");return;}
    toggleAction(a);return;
  }
  const act=A(a);
  if(!act){warnToast("未知的贴片动作："+a);return;}
  const v=p.get("v");
  if(log.some(e=>e.a===a&&Date.now()-e.t<20000)){warnToast(`刚刚已记录过「${act.name}」，已忽略重复扫描`);return;}
  if(act.type==="tap"||(act.type==="choice"&&v&&act.opts.includes(v))||((act.type==="num"||act.type==="meal")&&v&&!isNaN(v)))record(a,v||"");
  else openModal(a);
}

/* ====== 启动 ====== */
render();buildUrls();
(async()=>{
  if(sbReady())await Promise.race([sync(),new Promise(r=>setTimeout(r,4000))]);  // 先同步最新数据，再判断出入笼
  handleScan();
})();
