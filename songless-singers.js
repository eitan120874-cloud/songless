/* Songless – מצב "זמרים"
 * כל זמר הוא קטגוריה בפני עצמה: כל השירים של הזמר הזה (כל מה ש-iTunes מחזיר, עד 200 תוצאות), ורק שלו.
 * הקובץ נטען אחרי הסקריפט הראשי, משתמש במנוע המשחק הקיים (נגן, רמזים, ניקוד לשיר, השלמה אוטומטית)
 * ושומר התקדמות ב-U.sg (שדה נוסף ברשומת השחקן, נשמר ב-Firebase דרך saveUser הקיים).
 * הוא לא נוגע ב-U.points, בדרגות או בטבלת המובילים.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const app = $("vApp");
  if (!app || typeof AR === "undefined" || typeof show !== "function") return;

  const COMPLETE_BONUS = 500;           // בונוס על השלמת כל השירים של הזמר
  const BONUS_MIN_RATIO = 0;            // 0 = מספיק לעבור על כל השירים. למשל 0.6 = צריך גם לנחש 60% מהם
  const COUNT_TOWARD_TOTAL = true;      // true = הנקודות נספרות בטבלת המובילים ובדרגות. false = נשמרות בנפרד
  const MIN_STARS = 10;                 // מינימום שירים בסבב כדי לקבל כוכבים
  // רשימת זמרים להצגה. ריק = כל הזמרים שבמשחק. אפשר לכתוב שמות בעברית או באנגלית כמו ב-AR, למשל:
  // const ONLY = ["אייל גולן", "עומר אדם", "Queen"];
  const ONLY = [];

  const R1 = 0.6, R2 = 0.8, R3 = 0.9;   // אחוז הצלחה לכוכב / שני כוכבים / שלושה כוכבים

  const ex = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const key = a => a[1].replace(/[.$#\[\]\/\s]/g, "_");
  const stars = s => "⭐".repeat(s) + "☆".repeat(3 - s);
  const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const user = () => (typeof U !== "undefined" && U) || null;

  const origSongs = window.songsOf;
  let S = { active: false }, filt = "all", qs = "", busy = false;

  // ===== עיצוב =====
  const css = document.createElement("style");
  css.textContent = `
.sg-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px}
@media(min-width:480px){.sg-grid{grid-template-columns:repeat(3,1fr)}}
.sg-it{display:flex;flex-direction:column;align-items:center;gap:5px;padding:14px 8px;background:var(--cd);color:var(--tx);border:1px solid var(--bd);border-radius:14px;cursor:pointer;font-size:15px;transition:transform .15s,border-color .15s}
.sg-it:hover{border-color:var(--ac);transform:translateY(-2px)}
.sg-av{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;color:#fff;font-weight:700;font-size:21px;box-shadow:inset 0 0 0 2px rgba(255,255,255,.25)}
.sg-n{font-weight:600;text-align:center;line-height:1.3}
.sg-s{font-size:13px}.sg-b{font-size:11px;color:var(--mu)}
`;
  document.head.appendChild(css);

  // ===== מסכים חדשים =====
  const list = document.createElement("section");
  list.id = "sSingers"; list.hidden = true;
  list.innerHTML = `<button class="b" id="sgBack" style="width:100%;margin-bottom:10px">↩ תפריט</button>
<div class="card"><div style="font-size:20px;font-weight:600;text-align:center">🎤 זמרים</div>
<p class="sm" style="margin:6px 0 10px">בחר זמר ונחש את כל השירים שלו, רק שלו. ניקוד לכל שיר כמו תמיד (100/75/50/30/15), ו-${COMPLETE_BONUS} נקודות בונוס על השלמת כל השירים. אפשר לסיים בכל רגע עם "סיים".</p>
<input id="sgQ" placeholder="חיפוש זמר..." autocomplete="off"><div class="gen" id="sgGen"></div><div class="err" id="sgMsg"></div></div>
<div class="sg-grid" id="sgList"></div>`;
  const sum = document.createElement("section");
  sum.id = "sSingerSum"; sum.hidden = true;
  app.append(list, sum);
  SCR.push("sSingers", "sSingerSum");   // כדי ש-show() הקיים יסתיר ויציג אותם

  // כפתור במסך הבית
  const btn = document.createElement("button");
  btn.className = "b big"; btn.id = "bSing"; btn.textContent = "🎤 זמרים";
  btn.onclick = () => { $("sgMsg").textContent = ""; renderSingers(); show("sSingers"); };
  const after = $("bLv"); if (after) after.after(btn); else $("sHome").appendChild(btn);

  $("sgBack").onclick = () => { renderHome(); show("sHome"); };
  $("sgQ").oninput = e => { qs = e.target.value; renderSingers(); };

  function renderSingers() {
    const sg = (user() && user().sg) || {};
    $("sgGen").innerHTML = [["all", "הכל"], ...GEN].map(g => `<button class="${filt === g[0] ? "on" : ""}" data-g="${g[0]}">${g[1]}</button>`).join("");
    [...$("sgGen").children].forEach(b => b.onclick = () => { filt = b.dataset.g; renderSingers(); });
    const q = norm(qs);
    const L = AR.filter(a => (!ONLY.length || ONLY.includes(a[0]) || ONLY.includes(a[1])) && (filt === "all" || a[3].includes(filt)) && (!q || norm(a[0]).includes(q) || a[1].includes(q))).sort((a, b) => b[2] - a[2]);
    $("sgList").innerHTML = L.map(a => {
      const r = sg[key(a)] || { s: 0, c: 0, n: 0 }, h = hue(a[1]);
      return `<button class="sg-it" data-i="${AR.indexOf(a)}"><div class="sg-av" style="background:linear-gradient(145deg,hsl(${h} 65% 55%),hsl(${h} 70% 38%))">${ex(a[0][0].toUpperCase())}</div><span class="sg-n" dir="auto">${ex(a[0])}</span><span class="sg-s">${stars(r.s)}</span><span class="sg-b">${r.n ? `שיא: ${r.c}/${r.n}${r.b ? " · " + r.b + " נק׳" : ""}` : "עוד לא שוחק"}</span></button>`;
    }).join("") || '<p class="sm">לא נמצאו זמרים</p>';
    [...$("sgList").children].forEach(d => { if (d.dataset.i) d.onclick = () => start(+d.dataset.i); });
  }

  // ===== כל השירים של זמר =====
  const memc = {};
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  // השוואת שמות סלחנית לשוני בתעתיק (hanatsis / hanatzis וכו')
  const fz = s => norm(s).replace(/[^a-z\u0590-\u05ff0-9 ]/g, "").replace(/tz|ts|z/g, "z").replace(/kh|ch/g, "h").replace(/ph/g, "f").replace(/ou|oo/g, "u").replace(/ee|ie|y/g, "i").replace(/[qc]/g, "k").replace(/(.)\1+/g, "$1").trim();
  const sameName = (name, a) => !!name && (norm(name).includes(norm(a[0])) || fz(name).includes(fz(a[1])));

  async function getSongs(a) {
    if (memc[a[1]]) return memc[a[1]];
    const eng = isEng(a), cc = eng ? "US" : "IL", B = "https://itunes.apple.com/", dbg = { raw: 0, fail: 0 };
    getSongs.last = dbg;
    // בקשות אחת אחרי השנייה, עם ניסיון חוזר, כדי לא להיחסם על ידי iTunes
    const get = async u => {
      for (let t = 0; t < 2; t++) {
        try { const r = await fetch(u); if (r.ok) { const j = (await r.json()).results || []; dbg.raw += j.length; return j; } } catch (e) {}
        if (!t) await sleep(1500);
      }
      dbg.fail++; return [];
    };
    const srch = t => get(`${B}search?term=${encodeURIComponent(t)}&country=${cc}&media=music&entity=song&attribute=artistTerm&limit=200`);
    const found = [];   // [תוצאה, האם בטוחה (לפי מזהה האמן)]
    for (const t of eng ? [a[0]] : [a[0], a[1]]) { (await srch(t)).forEach(x => found.push([x, false])); await sleep(300); }
    let art = null;
    for (const t of eng ? [a[0]] : [a[0], a[1]]) {
      const ar = await get(`${B}search?term=${encodeURIComponent(t)}&country=${cc}&media=music&entity=musicArtist&limit=5`);
      art = ar.find(x => x.artistId && sameName(x.artistName, a)); if (art) break; await sleep(300);
    }
    if (art) (await get(`${B}lookup?id=${art.artistId}&country=${cc}&entity=song&limit=200`)).forEach(x => { if (x.artistId === art.artistId) found.push([x, true]); });
    let base = []; try { base = await origSongs(a); } catch (e) {}
    const seen = new Set(), out = [];
    const add = x => { const k = norm(x.n); if (!k || seen.has(k)) return; seen.add(k); out.push({ ...x, r: out.length }); };
    base.forEach(add);
    const longName = a[1].trim().split(/\s+/).length >= 2;   // שם מלא: אפשר לקבל גם שירים עם שם באנגלית
    for (const [x, sure] of found) {
      if ((x.wrapperType || "track") !== "track" || !x.previewUrl || !x.trackName) continue;
      if (!sure) {
        if (!sameName(x.artistName, a)) continue;
        if (!eng && !longName && !/[\u0590-\u05FF]/.test(x.trackName)) continue;
      }
      if (BADE.test(x.trackName) || BADH.test(x.trackName)) continue;
      add({ id: x.trackId, n: clean(x.trackName), f: x.trackName, a: a[0], u: x.previewUrl });
    }
    dbg.out = out.length;
    if (out.length >= 3) memc[a[1]] = out;   // לא שומרים תוצאה ריקה, כדי שניסיון חוזר יעבוד
    return out;
  }

  // ===== התחלת שלב של זמר =====
  async function start(i) {
    if (busy) return; busy = true;
    const a = AR[i], msg = $("sgMsg");
    msg.style.color = "var(--mu)"; msg.textContent = `טוען את כל השירים של ${a[0]}...`;
    try {
      const songs = await getSongs(a);
      if (songs.length < 3) { const d = getSongs.last || {}; msg.style.color = ""; msg.textContent = `לא נמצאו מספיק שירים (iTunes החזיר ${d.raw} תוצאות, ${d.fail} בקשות נכשלו). נסה שוב בעוד כמה שניות.`; return; }
      const q = shuffle(songs.slice());
      S = { active: true, a, i, k: key(a), queue: q, songs, total: q.length, N: q.length, exhausted: false, done: 0, ok: 0, pts: 0 };
      mode = "singer"; seenT = new Set();
      $("genFW").hidden = true; msg.textContent = "";
      rebuildPool(); endBtn.hidden = false;
      $("pool").textContent = `מאגר: ${songs.length} שירים של ${a[0]}`;
      show("sGame"); singerRound();
    } catch (e) { msg.style.color = ""; msg.textContent = "בעיית חיבור. נסה שוב."; }
    finally { busy = false; }
  }

  // סיבוב אחד (עותק של newRound הקיים, אבל השיר נלקח מרשימת הזמר)
  async function singerRound() {
    stop(); over = false; stage = 0; gu = []; cur = null; const id = ++lid;
    $("result").innerHTML = ""; $("inp").hidden = false; $("again").hidden = true;
    $("q").value = ""; $("sug").style.display = "none"; $("play").disabled = true;
    $("len").textContent = "טוען שיר..."; setGH(); bars(); render();
    while (S.queue.length) {
      const x = S.queue.shift();
      try {
        cur = x;
        await new Promise((res, rej) => { A.oncanplaythrough = res; A.onerror = rej; A.src = x.u; A.load(); setTimeout(res, 6000); });
        if (id !== lid) return;
        $("play").disabled = false; bars(); return;
      } catch (e) { cur = null; }
    }
    S.exhausted = true; S.N = S.done; summary();   // נגמרו השירים לפני הזמן
  }

  function leave() { endBtn.hidden = true; S.active = false; mode = "free"; lid++; stop(); rebuildPool(); }

  function summary() {
    const n = S.N, ok = S.ok;
    const st = n < MIN_STARS ? 0 : ok >= Math.ceil(n * R3) ? 3 : ok >= Math.ceil(n * R2) ? 2 : ok >= Math.ceil(n * R1) ? 1 : 0;
    const complete = (S.done >= S.total || S.exhausted) && S.total >= MIN_STARS && ok >= Math.ceil(S.total * BONUS_MIN_RATIO);
    const bonus = complete ? COMPLETE_BONUS : 0, pts = S.pts + bonus;
    let best = false, up = null;
    const u = user();
    if (u && n) {
      u.sg = u.sg || {};
      const p = u.sg[S.k] || { s: 0, c: 0, n: 0, b: 0 };
      best = pts > (p.b || 0) || !p.n;
      u.sg[S.k] = { s: Math.max(p.s, st), c: best ? ok : p.c, n: best ? n : p.n, b: Math.max(p.b || 0, pts) };
      if (COUNT_TOWARD_TOTAL) {
        // נרשם כ"שלב" ב-U.lv, ולכן הקוד הקיים סוכם אותו לניקוד הכולל ולכוכבים בלי שום שינוי
        u.lv = u.lv || {};
        const pl = u.lv["S_" + S.k] || { b: 0, s: 0 };
        const R = window.SLRanks, before = R ? R.rankOf(Number(u.points) || 0) : null;
        u.lv["S_" + S.k] = { b: Math.max(pl.b, pts), s: Math.max(pl.s, st) };
        u.points = Object.values(u.lv).reduce((t, x) => t + (x.b || 0), 0);
        const after = R ? R.rankOf(u.points) : null;
        if (R && R.levelUp && after.n > before.n) up = [before, after];
      }
      try { saveUser(); } catch (e) {}
    }
    const a = S.a, i = S.i;
    leave();
    sum.innerHTML = `<div class="card" style="text-align:center">
<div class="res" style="color:var(--${st ? "ok" : "bad"})">${st ? "🎉 כל הכבוד!" : "😔 לא הפעם"}</div>
<div style="font-size:34px">${stars(st)}</div>
<div style="font-size:20px;font-weight:600;margin-top:6px" dir="auto">${ex(a[0])}</div>
<p class="sm" style="font-size:14px">ניחשת ${ok} מתוך ${n} שירים · ${pts} נקודות${best && pts ? " · 🏅 שיא חדש!" : ""}</p>
${complete ? `<p class="sm" style="font-size:14px;color:var(--ok)">🎁 השלמת את כל השירים! בונוס +${bonus} נקודות</p>` : ""}${n < MIN_STARS ? `<p class="sm">שחק לפחות ${MIN_STARS} שירים כדי לקבל כוכבים</p>` : ""}</div>
<div class="row"><button class="b p" id="sgAgain">שחק שוב</button></div>
<div class="row" style="margin-top:8px"><button class="b" id="sgToList">לרשימת הזמרים</button></div>`;
    $("sgAgain").onclick = () => start(i);
    $("sgToList").onclick = () => { renderSingers(); show("sSingers"); };
    show("sSingerSum");
    if (up) window.SLRanks.levelUp(up[0], up[1]);
  }

  // כפתור "סיים" במסך המשחק
  const endBtn = document.createElement("button");
  endBtn.className = "b"; endBtn.textContent = "סיים"; endBtn.hidden = true; endBtn.style.flex = "0 0 auto";
  endBtn.onclick = () => {
    if (!S.active) return;
    if (!S.done) { leave(); renderSingers(); show("sSingers"); return; }
    summary();
  };
  $("gh").parentNode.appendChild(endBtn);

  // ===== חיבור למנוע הקיים (עטיפות, בלי לשנות את הפונקציות עצמן) =====
  const oFinish = window.finish;
  window.finish = function (win) {
    const r = oFinish.apply(this, arguments);       // הגוף של finish רץ סינכרונית
    if (S.active) {
      S.done++; if (win) { S.ok++; S.pts += PT[stage]; }
      $("next").textContent = S.done >= S.N ? "לסיכום ▶" : "שיר הבא ▶";
      setGH();
    }
    return r;
  };

  // בזמן טעינת זמר, עוצרים את הטעינה ברקע של המשחק כדי ש-iTunes לא יחסום אותנו
  window.songsOf = async function () {
    while (busy) await sleep(400);
    return origSongs.apply(this, arguments);
  };

  const oSet = window.setGH;
  window.setGH = function () {
    if (S.active) { $("gh").textContent = `🎤 ${S.a[0]} · שיר ${Math.min(over ? S.done : S.done + 1, S.N)}/${S.N} · ${S.pts} נק׳`; return; }
    return oSet.apply(this, arguments);
  };

  const oRB = window.rebuildPool;       // השלמה אוטומטית: רק שירי הזמר
  window.rebuildPool = function () {
    oRB.apply(this, arguments);
    if (S.active) { pool = S.songs.map(s => s.n + " - " + s.a); $("pool").textContent = `מאגר: ${S.songs.length} שירים של ${S.a[0]}`; }
  };

  const nb = $("next"), onNext = nb.onclick;
  nb.onclick = function (e) { if (S.active) { S.done >= S.N ? summary() : singerRound(); return; } return onNext.call(this, e); };

  const bad = $("bad"), onBad = bad.onclick;
  bad.onclick = function (e) { if (S.active) { if (!over) singerRound(); return; } return onBad.call(this, e); };

  const bk = document.querySelector("#sGame .back"), onBk = bk.onclick;
  bk.onclick = function (e) {
    if (S.active) {
      if (S.done > 0 && S.done < S.N && !confirm("לצאת? ההתקדמות בשלב תאבד.")) return;
      leave(); renderSingers(); show("sSingers"); return;
    }
    return onBk.call(this, e);
  };
})();
