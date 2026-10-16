/* ====== NFC 扫描处理 ====== */
function handleScan(){
  const p=new URLSearchParams(location.search);let a=p.get("a");
  if(!a)return;
  history.replaceState(null,"",location.pathname);

  // 兼容旧贴片：如果带了 _out / _in 后缀，也能定位到计时项
  const x=IDX[a];
  if(!x){warnToast("未知的贴片动作："+a);return;}

  // 自动切到该记录项所属的档案
  if(x.p.id!==curId){setCur(x.p.id);weekOff=0;render();}

  // 计时项：20 秒内重复扫描忽略
  if(isTimer(a)){
    const it=x.it,ids=[it.id+"_out",it.id+"_in"];
    if(log.some(e=>ids.includes(e.a)&&Date.now()-e.t<20000)){warnToast("刚刚已记录过，已忽略重复扫描");return;}
    toggleAction(a);return;
  }

  const act=x.it,v=p.get("v");
  if(log.some(e=>e.a===a&&Date.now()-e.t<20000)){warnToast(`刚刚已记录过「${act.name}」，已忽略重复扫描`);return;}
  if(act.type==="tap"||act.type==="remind"
    ||(act.type==="choice"&&v&&optNames(act).includes(v))
    ||(act.type==="num"&&v&&!isNaN(v)))record(a,v||"");
  else openModal(a);
}

/* ====== 启动 ====== */
render();buildUrls();
(async()=>{
  if(sbReady())await Promise.race([sync(),new Promise(r=>setTimeout(r,4000))]);  // 先同步最新数据，再判断出入笼
  handleScan();
})();
