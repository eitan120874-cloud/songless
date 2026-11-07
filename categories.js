/* ===== Songless – קטגוריות זמרים =====
   בוחרים זמר, מנחשים את כל השירים שלו (עד 200 שירים לזמר, לפי מה ש-iTunes מחזיר), ושירים שניחשת נשמרים ולא חוזרים.
   ההתקדמות נשמרת ברשומת השחקן ב-Firebase בשדה done, וגם בקובץ הזה אין שינוי בניקוד או בדרגות.
   חיבור: להוסיף ל-index.html, מיד אחרי הסקריפט הראשי, תג script עם src="categories.js". */
(function(){try{
  if(typeof U==="undefined"||typeof AR==="undefined"||typeof songsOf==="undefined")return;
  let curA=null,artistDone=false;
  const dk=a=>a[1].replace(/[.$#\[\]\/\s]/g,"_");
  const doneSet=a=>new Set(((U&&U.done)||{})[dk(a)]||[]);
  const prog=a=>{const e=cache[a[1]],s=e?e.s:[],d=doneSet(a);return{n:s.filter(x=>d.has(x.id)).length,t:s.length,known:!!e}};

  // ----- טעינת כל שירי הזמר (עד 200) -----
  // הרשימה הקיימת (25 הראשונים) נשארת בדיוק כמו שהייתה, כדי שהשלבים לא ישתנו. שירים נוספים מצטרפים אחריה.
  const sl=ms=>new Promise(r=>setTimeout(r,ms));
  const CC=a=>isEng(a)?"US":"IL";
  const AID=jget("sl_aid",{});
  const _fetch=window.fetch.bind(window);
  let nextSlot=0;
  async function gated(u,o){
    if(String(u).includes("itunes.apple.com")){
      const now=Date.now(),at=Math.max(now,nextSlot);nextSlot=at+(window.__GAP||3000);
      if(at>now)await sl(at-now);
    }
    return _fetch(u,o);
  }
  window.fetch=async function(u,o){
    const r=await gated(u,o);
    try{
      if(String(u).includes("itunes.apple.com/search")){
        const j=await r.clone().json();let ch=false;
        (j.results||[]).forEach(x=>{if(x.artistId&&x.artistName){const k=norm(x.artistName);if(AID[k]!==x.artistId){AID[k]=x.artistId;ch=true}}});
        if(ch)jset("sl_aid",AID);
      }
    }catch(e){}
    return r;
  };
  function findAid(a){
    const na=norm(a[0]),ks=Object.keys(AID);
    const k=ks.find(x=>x===na)||ks.find(x=>x.includes(na)||x.includes(a[1]));
    return k?AID[k]:null;
  }
  async function extend(a,base){
    let id=findAid(a);
    if(!id){
      await window.fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(a[0])}&country=${CC(a)}&media=music&entity=song&attribute=artistTerm&limit=10`).catch(()=>{});
      id=findAid(a);
    }
    if(!id)return null;
    const r=await gated(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=200&country=${CC(a)}`);
    if(!r.ok)return null;
    const j=await r.json();
    const seenId=new Set(base.map(x=>x.id)),seenN=new Set(base.map(x=>norm(x.n))),out=base.slice();
    for(const x of (j.results||[])){
      if(!x.trackId||!x.previewUrl||!x.trackName)continue;
      if(!(isEng(a)||/[\u0590-\u05FF]/.test(x.trackName)))continue;
      if(BADE.test(x.trackName)||BADH.test(x.trackName))continue;
      if(x.artistName&&!(norm(x.artistName).includes(norm(a[0]))||norm(x.artistName).includes(a[1])))continue;
      const n=clean(x.trackName),k=norm(n);
      if(!k||seenId.has(x.trackId)||seenN.has(k))continue;
      seenId.add(x.trackId);seenN.add(k);
      out.push({id:x.trackId,n,f:x.trackName,a:a[0],u:x.previewUrl,r:out.length});
    }
    return out;
  }
  const _songsOf=songsOf,pend={};
  songsOf=function(a){
    const k=a[1];
    if(pend[k])return pend[k];
    const p=(async()=>{
      let c=cache[k];
      if(c&&c.full&&Date.now()-c.t<864e5)return c.s;
      const base=await _songsOf(a);
      c=cache[k];
      if(!c||!base.length)return base;
      try{
        const all=await extend(a,base);
        if(all){c.s=all;c.full=true;jset("sl_c6",cache);rebuildPool()}
      }catch(e){}
      return c.s;
    })();
    pend[k]=p;
    const done=()=>{delete pend[k]};
    p.then(done,done);
    return p;
  };
  // השלמה ברקע לזמרים שכבר נשמרו בגרסה הקצרה
  let ext=false;const tried=new Set();
  async function extendLoop(){
    if(ext)return;ext=true;
    try{
      while(!$("sCats").hidden||(mode==="artist"&&!$("sGame").hidden)){
        const a=AR.find(x=>inSel(x)&&cache[x[1]]&&cache[x[1]].s.length&&!cache[x[1]].full&&!tried.has(x[1]));
        if(!a)break;
        tried.add(a[1]);
        try{await songsOf(a)}catch(e){await sl(8000)}
      }
    }finally{ext=false}
  }

  // ----- עיצוב ומסך -----
  const css=document.createElement("style");
  css.textContent=".cbar{height:6px;background:var(--bd);border-radius:3px;margin-top:6px;overflow:hidden}.cbar i{display:block;height:100%;background:var(--ok);border-radius:3px;transition:width .4s}";
  document.head.appendChild(css);
  const btn=document.createElement("button");
  btn.className="b big";btn.id="bCats";btn.textContent="🎤 קטגוריות זמרים";
  $("bLv").after(btn);
  const sec=document.createElement("section");
  sec.id="sCats";sec.hidden=true;
  sec.innerHTML='<button class="b back" style="width:100%;margin-bottom:10px">↩ תפריט</button><p class="sm" style="margin:0 0 6px">סגנונות:</p><div class="gen" id="genC"></div><p class="sm" style="margin:0 0 10px">בחר זמר ונחש את כל השירים שלו. שירים שניחשת נשמרים ולא יחזרו.</p><div id="cats"></div>';
  $("sHow").before(sec);
  SCR.push("sCats");
  const gback=$("sGame").querySelector(".back");

  function renderCats(){
    const L=AR.map((a,i)=>[a,i]).filter(x=>inSel(x[0])).sort((p,q)=>q[0][2]-p[0][2]);
    $("cats").innerHTML=L.map(([a,i])=>{
      const p=prog(a),pct=p.t?Math.round(100*p.n/p.t):0;
      const txt=p.known&&p.t?p.n+"/"+p.t+(p.n>=p.t?" ✅":""):"—";
      return `<div class="lv" data-i="${i}"><div style="flex:1"><b>${a[0]}</b><div class="cbar"><i style="width:${pct}%"></i></div></div><div class="sm" style="white-space:nowrap">${txt}</div></div>`;
    }).join("");
    [...$("cats").children].forEach(d=>d.onclick=()=>startArtist(+d.dataset.i));
  }
  function renderGenC(){
    const el=$("genC");
    el.innerHTML=GEN.map(g=>`<button class="${SEL.has(g[0])?"on":""}" data-g="${g[0]}">${g[1]}</button>`).join("");
    [...el.children].forEach(b=>b.onclick=()=>{const
