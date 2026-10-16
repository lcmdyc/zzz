/* ====== 默认档案模板 ======
   TPL_ZZ()      皂皂（id 与旧版完全一致，旧数据/旧贴片无需迁移）
   TPL_ME(pid)   "我自己"预设模板，记录项 id 形如 p2_<档案id>_xxx
   只在"本机和云端都没有配置"时使用一次，之后以保存的配置为准。 */

function TPL_ZZ(){
  const num=(k,d)=>{const v=parseFloat(localStorage.getItem(k));return isNaN(v)?d:v;};
  let iv={};try{iv=JSON.parse(localStorage.getItem("zaozao_iv")||"{}");}catch(_){}
  const days=(id,d)=>(+iv[id]>0?+iv[id]:d);
  return {id:"zz",name:"皂皂",emoji:"🐶",items:[
    {id:"crate",name:"笼子",emoji:"🏠",type:"timer",cat:"笼子",keep:false,
      lo:"出笼",li:"进笼",eo:"🔓",ei:"🔒",tOpen:"🟢 正在笼外",tShut:"在笼内",
      goal:num("zaozao_goal",4),gaps:true,gapLbl:"出笼前笼内",
      gg:num("zaozao_gg",3),rr:num("zaozao_gr",6),chart:true,gchart:true},
    {id:"walk",name:"遛狗",emoji:"🚶",type:"timer",cat:"遛狗",keep:false,
      lo:"出门遛狗",li:"遛狗回家",eo:"🚶",ei:"🏠",tOpen:"🟢 遛狗中",tShut:"🏠 在家",
      goal:0,gaps:false,gapLbl:"",gg:3,rr:6,chart:true,gchart:false},
    {id:"wake",name:"起床放出半小时",emoji:"🌅",type:"tap",target:1,cat:"日常",keep:false},
    {id:"meal",name:"狗粮",emoji:"🍽️",type:"num",unit:"g",quick:[80,70,60,50],target:2,sum:true,chart:true,cat:"饮食",keep:false},
    {id:"snack",name:"零食",emoji:"🦴",type:"tap",target:0,cat:"饮食",keep:false},
    {id:"newfood",name:"换粮/新食物",emoji:"🆕",type:"note",cat:"饮食",keep:false},
    {id:"play",name:"笼外互动/训练半小时",emoji:"🎾",type:"tap",target:1,cat:"运动",keep:false},
    {id:"brain",name:"嗅闻藏食半小时",emoji:"🧠",type:"tap",target:1,cat:"运动",keep:false},
    {id:"poop",name:"大便",emoji:"💩",type:"choice",cat:"大便",keep:false,cal:true,ctx:true,opts:[
      {n:"正常",c:"#3c9a4a",r:0},{n:"偏软",c:"#d9a21b",r:1},{n:"拉稀",c:"#d9534f",r:3},
      {n:"偏硬",c:"#d9a21b",r:1},{n:"带黏液",c:"#e0703a",r:2},{n:"带血",c:"#8b1a1a",r:4}]},
    {id:"abn",name:"异常事件",emoji:"⚠️",type:"choice",cat:"异常",keep:false,cal:false,ctx:true,cls:"abn",opts:[
      {n:"发抖",c:"#d9534f",r:1},{n:"呕吐",c:"#d9534f",r:1},{n:"哼唧",c:"#d9534f",r:1},
      {n:"顶手",c:"#d9534f",r:1},{n:"咳嗽",c:"#d9534f",r:1},{n:"其他",c:"#d9534f",r:1}]},
    {id:"weight",name:"体重(kg)",emoji:"⚖️",type:"num",unit:"kg",quick:[],target:0,sum:false,chart:true,cat:"体重",keep:true},
    {id:"bath",name:"洗澡",emoji:"🛁",type:"tap",target:0,cat:"洗澡",keep:false},
    {id:"outer",name:"外驱",emoji:"🐛",type:"remind",d:days("outer",30),cat:"外驱",keep:true},
    {id:"inner",name:"内驱",emoji:"💊",type:"remind",d:days("inner",90),cat:"内驱",keep:true},
    {id:"vacc",name:"狂犬疫苗",emoji:"💉",type:"remind",d:days("vacc",365),cat:"疫苗",keep:true},
    {id:"health",name:"健康备注",emoji:"🩺",type:"note",cat:"健康",keep:true}
  ]};
}

function TPL_ME(pid){
  const k=s=>`p2_${pid}_${s}`;
  return {id:pid,name:"我自己",emoji:"🙂",items:[
    {id:k("water"),name:"喝水（杯）",emoji:"💧",type:"tap",target:8,cat:"日常",keep:false},
    {id:k("run"),name:"运动",emoji:"🏃",type:"timer",cat:"运动",keep:false,
      lo:"开始运动",li:"结束运动",eo:"▶️",ei:"⏹️",tOpen:"🟢 运动中",tShut:"未在运动",
      goal:0.5,gaps:false,gapLbl:"",gg:3,rr:6,chart:true,gchart:false},
    {id:k("sleep"),name:"睡眠",emoji:"😴",type:"timer",cat:"睡眠",keep:false,
      lo:"入睡",li:"起床",eo:"🌙",ei:"🌅",tOpen:"😴 睡眠中",tShut:"清醒",
      goal:7.5,gaps:false,gapLbl:"",gg:3,rr:6,chart:true,gchart:false},
    {id:k("weight"),name:"体重(kg)",emoji:"⚖️",type:"num",unit:"kg",quick:[],target:0,sum:false,chart:true,cat:"体重",keep:true},
    {id:k("med"),name:"吃药",emoji:"💊",type:"tap",target:0,cat:"健康",keep:false},
    {id:k("mood"),name:"心情",emoji:"😊",type:"choice",cat:"心情",keep:false,cal:true,ctx:false,opts:[
      {n:"很好",c:"#3c9a4a",r:0},{n:"平静",c:"#6aa6e0",r:0},{n:"一般",c:"#d9a21b",r:1},
      {n:"低落",c:"#e0703a",r:2},{n:"很差",c:"#d9534f",r:3}]},
    {id:k("sick"),name:"身体不适",emoji:"🤒",type:"choice",cat:"健康",keep:false,cal:true,ctx:false,cls:"abn",opts:[
      {n:"头痛",c:"#d9a21b",r:1},{n:"胃不适",c:"#d9a21b",r:1},{n:"失眠",c:"#e0703a",r:2},
      {n:"发烧",c:"#d9534f",r:3},{n:"其他",c:"#e0703a",r:2}]},
    {id:k("dental"),name:"洗牙",emoji:"🦷",type:"remind",d:180,cat:"健康",keep:true},
    {id:k("checkup"),name:"体检",emoji:"🩺",type:"remind",d:365,cat:"健康",keep:true},
    {id:k("memo"),name:"随记",emoji:"📝",type:"note",cat:"随记",keep:false}
  ]};
}
