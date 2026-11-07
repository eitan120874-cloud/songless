/* ===== Songless – מערכת דרגות (50 דרגות) =====
   הדרגה מחושבת תמיד מהניקוד הקיים של השחקן (U.points), ולכן לא נשמר ב-Firebase שדה חדש.
   חיבור: <script src="ranks.js"></script> לפני הסקריפט הראשי. API: window.SLRanks */
(function(root){
  const NAMES=["אוזן מוזיקלית","מתחילים לזמזם","צייד הלהיטים","שיר מוכר","תותח הפזמונים","מלך הפלייליסט","זיכרון מוזיקלי","מזהה הצלילים","מכונת להיטים","אלוף הרדיו","חובב מוזיקה","שומע הכול","צייד המילים","מומחה הפזמונים","אולפן הלהיטים","גאון מוזיקלי","שומר הקצב","מפצח המנגינות","אשף השירים","אגדה מקומית","DJ מקצועי","מפלצת המוזיקה","מאסטר הפזמונים","מוח מוזיקלי","גורו המוזיקה","צייד הלהיטים האבודים","אוזן של זהב","פרופסור למוזיקה","מכונת זיהוי אנושית","קיסר המנגינות","מפענח הצלילים","שובר המצעדים","אגדה מוזיקלית","שליט הפלייליסט","המוח שמאחורי הביט","צליל בלתי נשכח","מפלצת הזיהוי","גאון התווים","שומע מעבר לזמן","אלוף האלופים","מיתוס המוזיקה","מלך המנגינות","האלגוריתם האנושי","אוזן על־אנושית","בלתי ניתן להטעיה","אגדה חיה","שובר המציאות","אל המוזיקה","המוח המוזיקלי האולטימטיבי","אלוף ה-SONGLESS"];
  const ICONS=["👂","🎶","🏹","🎵","💥","🎧","🧠","🔍","⚙️","📻","💙","🦻","🎯","🎤","🎙️","💡","🥁","🔓","🪄","🏙️","💿","👹","🎼","🧩","🧘","🗺️","🥇","🎓","🤖","🏛️","🔬","📈","📖","🪩","🎛️","🔔","🦖","🎹","⏳","🏆","🐉","👑","🧮","👽","🛡️","🔥","🌀","⚡","🌌","💎"];
  // שלבי צבע: ירוק, כחול, סגול, כתום, אדום, זהב
  const TIERS=[
    {from:1,to:10,name:"מתחילים",h:145,s:55},
    {from:11,to:20,name:"מקצוענים",h:215,s:75},
    {from:21,to:30,name:"מומחים",h:268,s:65},
    {from:31,to:40,name:"מאסטרים",h:28,s:90},
    {from:41,to:49,name:"אגדות",h:2,s:75},
    {from:50,to:50,name:"אלופי Songless",h:45,s:95,gold:true}
  ];
  const tierOf=n=>TIERS.find(t=>n>=t.from&&n<=t.to);
  const RANKS=NAMES.map((name,i)=>{
    const n=i+1,t=tierOf(n),len=t.to-t.from,idx=n-t.from;
    const l=t.gold?50:52-Math.round(12*idx/Math.max(1,len));
    return{n,name,icon:ICONS[i],tier:t.name,gold:!!t.gold,color:`hsl(${t.h} ${t.s}% ${l}%)`,min:0};
  });

  // סף הניקוד לכל דרגה: עקומה עולה, שמגיעה ל-92% מהניקוד המקסימלי האפשרי בדרגה 50.
  let maxPts=2500;
  function build(){
    const top=Math.round(maxPts*0.92/5)*5;let prev=-5;
    RANKS.forEach((r,i)=>{const m=i===0?0:Math.max(prev+5,Math.round(top*Math.pow(i/49,1.3)/5)*5);r.min=m;prev=m});
  }
  // הניקוד המקסימלי האפשרי במשחק = מספר שלבים × שירים בשלב × 100
  function setMax(v){if(v>0){maxPts=v;build()}}
  build();

  function get(points){
    const p=Math.max(0,+points||0);let i=0;
    while(i+1<RANKS.length&&RANKS[i+1].min<=p)i++;
    const rank=RANKS[i],next=RANKS[i+1]||null;
    return{rank,next,pct:next?(p-rank.min)/(next.min-rank.min):1,left:next?next.min-p:0,points:p};
  }
  const badge=points=>{const r=get(points).rank;return`<span class="rk-badge" title="${r.name}">${r.icon}</span>`};

  function render(el,points){
    if(!el)return;
    const g=get(points),r=g.rank,nx=g.next;
    el.innerHTML=`<div class="rk-card" style="--rc:${r.color}">
      <div class="rk-top"><div class="rk-ic${r.gold?" gold":""}">${r.icon}</div>
      <div class="rk-tx"><div class="rk-tier">${r.tier} · דרגה ${r.n} מתוך 50</div><div class="rk-name">${r.name}</div></div></div>
      ${nx?`<div class="rk-bar"><i style="width:${Math.round(g.pct*100)}%"></i></div>
      <div class="rk-next">עוד <b>${g.left}</b> נקודות לדרגה הבאה: <span style="color:${nx.color};font-weight:600">${nx.icon} ${nx.name}</span></div>`
      :`<div class="rk-next">🏆 הגעת לדרגה הגבוהה ביותר!</div>`}</div>`;
  }

  function renderAll(el,points){
    if(!el)return;
    const cur=get(points).rank.n;let html="",last="";
    for(const r of RANKS){
      if(r.tier!==last){last=r.tier;html+=`<div class="rk-th" style="--rc:${r.color}">${r.tier}</div>`}
      const st=r.n===cur?" on":r.n<cur?" done":" lock";
      html+=`<div class="rk-row${st}" style="--rc:${r.color}"><div class="rk-ic sm${r.gold?" gold":""}">${r.icon}</div><div class="rk-rt"><b>${r.name}</b><span>דרגה ${r.n}</span></div><div class="rk-pt">${r.n<cur?"✓":r.min+" נק׳"}</div></div>`;
    }
    el.innerHTML=html;
  }

  function showLevelUp(a,b){
    if(typeof document==="undefined")return;
    const ov=document.createElement("div");ov.className="rk-ov";
    const jump=b.n-a.n>1?`<div class="rk-sub">קפצת ${b.n-a.n} דרגות בבת אחת!</div>`:"";
    ov.innerHTML=`<div class="rk-modal" style="--rc:${b.color}"><div class="rk-burst">🎉 ✨ 🎊</div><div class="rk-h">עלית דרגה!</div>
      <div class="rk-ic big${b.gold?" gold":""}">${b.icon}</div><div class="rk-name">${b.name}</div>
      <div class="rk-sub">${b.tier} · דרגה ${b.n} מתוך 50</div>${jump}
      <div class="rk-from">מדרגה ${a.icon} ${a.name}</div><button class="rk-btn">המשך</button></div>`;
    ov.querySelector("button").onclick=()=>ov.remove();
    ov.onclick=e=>{if(e.target===ov)ov.remove()};
    document.body.appendChild(ov);
  }
  function checkLevelUp(oldPts,newPts){
    const a=get(oldPts).rank,b=get(newPts).rank;
    if(b.n>a.n){showLevelUp(a,b);return true}return false;
  }

  if(typeof document!=="undefined"){
    const css=document.createElement("style");
    css.textContent=`
.rk-card{background:var(--cd,#fff);border:1px solid var(--bd,#ddd);border-inline-start:5px solid var(--rc);border-radius:14px;padding:14px;margin-bottom:12px;color:var(--tx,#111)}
.rk-top{display:flex;align-items:center;gap:12px}
.rk-ic{flex:0 0 auto;width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:28px;background:color-mix(in srgb,var(--rc) 20%,transparent);border:2px solid var(--rc)}
.rk-ic.sm{width:40px;height:40px;font-size:20px}
.rk-ic.big{width:96px;height:96px;font-size:48px;margin:6px auto 10px;border-width:3px;box-shadow:0 0 30px color-mix(in srgb,var(--rc) 55%,transparent)}
.rk-ic.gold{background:linear-gradient(135deg,#fff3b0,#f5b800 55%,#fff3b0);border-color:#e0a100;box-shadow:0 0 22px rgba(245,184,0,.55)}
.rk-tier{font-size:12px;color:var(--mu,#777)}
.rk-name{font-size:20px;font-weight:700;line-height:1.3}
.rk-bar{height:10px;border-radius:5px;background:var(--bd,#ddd);margin:12px 0 6px;overflow:hidden}
.rk-bar i{display:block;height:100%;background:var(--rc);border-radius:5px;transition:width .6s}
.rk-next{font-size:13px;color:var(--mu,#777)}
.rk-next b{color:var(--tx,#111)}
.rk-badge{font-size:15px}
.rk-th{margin:14px 0 6px;font-weight:700;font-size:14px;color:var(--rc);border-bottom:2px solid var(--rc);padding-bottom:4px}
.rk-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--bd,#ddd);border-radius:12px;margin-bottom:6px;background:var(--cd,#fff);color:var(--tx,#111)}
.rk-row .rk-rt{flex:1;display:flex;flex-direction:column;font-size:15px}
.rk-row .rk-rt span{font-size:12px;color:var(--mu,#777)}
.rk-row .rk-pt{font-size:13px;color:var(--mu,#777)}
.rk-row.on{border:2px solid var(--rc);background:color-mix(in srgb,var(--rc) 14%,var(--cd,#fff))}
.rk-row.done{opacity:.8}.rk-row.lock{opacity:.5}
.rk-ov{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:1000;padding:16px}
.rk-modal{width:100%;max-width:340px;background:var(--cd,#fff);color:var(--tx,#111);border:2px solid var(--rc);border-radius:22px;padding:22px 18px;text-align:center;box-shadow:0 0 40px color-mix(in srgb,var(--rc) 50%,transparent);animation:rkpop .45s cubic-bezier(.2,1.4,.4,1)}
.rk-burst{font-size:26px;animation:rkb 1.2s ease-in-out infinite}
.rk-h{font-size:26px;font-weight:800;margin:4px 0;color:var(--rc)}
.rk-sub{font-size:14px;color:var(--mu,#777);margin-top:4px}
.rk-from{font-size:13px;color:var(--mu,#777);margin:10px 0 16px}
.rk-btn{width:100%;padding:13px;border:0;border-radius:12px;background:var(--rc);color:#fff;font-size:16px;font-weight:700;cursor:pointer}
@keyframes rkpop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes rkb{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@media (prefers-reduced-motion:reduce){.rk-modal,.rk-burst{animation:none}.rk-bar i{transition:none}}`;
    document.head.appendChild(css);
  }

  root.SLRanks={RANKS,TIERS,setMax,get,render,renderAll,badge,checkLevelUp,showLevelUp};
})(typeof window!=="undefined"?window:globalThis);
