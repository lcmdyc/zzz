/* 动作列表
   type: tap | num | meal(克数) | choice | note ; ctx:true 记录时自动附带关联信息 */
const ACTIONS=[
  {id:"crate_out",name:"出笼",emoji:"🔓",type:"tap",cat:"笼子",hide:true},
  {id:"crate_in", name:"进笼",emoji:"🔒",type:"tap",cat:"笼子",hide:true},
  {id:"walk_out", name:"出门遛狗",emoji:"🚶",type:"tap",cat:"遛狗",hide:true},
  {id:"walk_in",  name:"遛狗回家",emoji:"🏠",type:"tap",cat:"遛狗",hide:true},
  {id:"walk",     name:"遛狗(旧记录)",emoji:"🚶",type:"tap",cat:"遛狗",hide:true},
  {id:"wake",  name:"起床放出/上厕所", emoji:"🌅", type:"tap", target:1, cat:"日常"},
  {id:"meal",  name:"喂食",     emoji:"🍽️", type:"meal", target:2, cat:"饮食", grams:[30,40,50,60]},
  {id:"snack", name:"零食",     emoji:"🦴", type:"tap", cat:"饮食"},
  {id:"newfood",name:"换粮/新食物",emoji:"🆕", type:"note", cat:"饮食"},
  {id:"wipe",  name:"回家擦洗", emoji:"🧼", type:"tap", target:1, cat:"日常"},
  {id:"play",  name:"笼外互动/训练", emoji:"🎾", type:"tap", target:1, cat:"运动"},
  {id:"brain", name:"脑力游戏", emoji:"🧠", type:"tap", target:1, cat:"运动"},
  {id:"night", name:"夜间短遛", emoji:"🌙", type:"tap", target:1, cat:"运动"},
  {id:"poop",  name:"大便",     emoji:"💩", type:"choice", opts:["正常","偏软","拉稀","偏硬","带黏液","带血"], cat:"大便", ctx:true},
  {id:"abn",   name:"异常事件", emoji:"⚠️", type:"choice", opts:["发抖","喘气","呕吐","哼唧","顶手","咳嗽","其他"], cat:"异常", ctx:true, cls:"abn"},
  {id:"weight",name:"体重(kg)", emoji:"⚖️", type:"num", cat:"体重"},
  {id:"bath",  name:"洗澡",     emoji:"🛁", type:"tap", cat:"洗澡"},
  {id:"outer", name:"外驱",     emoji:"🐛", type:"tap", cat:"外驱"},
  {id:"inner", name:"内驱",     emoji:"💊", type:"tap", cat:"内驱"},
  {id:"vacc",  name:"疫苗",     emoji:"💉", type:"tap", cat:"疫苗"},
  {id:"health",name:"健康备注", emoji:"🩺", type:"note", cat:"健康"}
];
/* 到期提醒：d 是默认周期（天），页面里也可以直接改 */
const REM=[
  {id:"inner",label:"内驱",emoji:"💊",d:90},
  {id:"outer",label:"外驱",emoji:"🐛",d:30},
  {id:"vacc", label:"疫苗",emoji:"💉",d:365}
];
/* 大便状态颜色与严重程度 */
const PC={"正常":"#3c9a4a","偏软":"#d9a21b","偏硬":"#d9a21b","带黏液":"#e0703a","拉稀":"#d9534f","带血":"#8b1a1a"};
const PRANK={"正常":0,"偏软":1,"偏硬":1,"带黏液":2,"拉稀":3,"带血":4};
/* 月报删除原始数据时始终保留的动作 */
const KEEP=["inner","outer","vacc","weight","health"];
