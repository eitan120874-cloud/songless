/* Songless – מצב "זמרים"
 * כל זמר הוא שלב בפני עצמו: 10 שירים של הזמר הזה בלבד.
 * הקובץ נטען אחרי הסקריפט הראשי, משתמש במנוע המשחק הקיים (נגן, רמזים, ניקוד לשיר, השלמה אוטומטית)
 * ושומר התקדמות ב-U.sg (שדה נוסף ברשומת השחקן, נשמר ב-Firebase דרך saveUser הקיים).
 * הוא לא נוגע ב-U.points, בדרגות או בטבלת המובילים.
 */
(function () {
  "use strict";
  const $ = id => document.getElementById(id);
  const app = $("vApp");
  if (!app || typeof AR === "undefined" || typeof show !== "function") return;

  const PER_STAGE = 10;                 // כמה שירים בשלב של זמר
  const R1 = 0.6, R2 = 0.8, R3 = 0.9;   // אחוז הצלחה לכוכב / שני כוכבים / שלושה כוכבים

  const ex = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const key = a => a[1].replace(/[.$#\[\]\/\s]/g, "_");
  const stars = s => "⭐".repeat(s) + "☆".repeat(3 - s);
  const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const user = () => (typeof U !== "undefined" && U) || null;

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
<p class="sm" style="margin:6px 0 10px">בחר זמר ונחש ${PER_STAGE} שירים שלו בלבד. אפשר לשחק בכל זמר בכל סדר.</p>
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
    const L = AR.filter(a => (filt === "all" || a[3].includes(filt)) && (!q || norm(a[0]).includes(q) || a[1].includes(q))).sort((a, b) => b[2] - a[2]);
    $("sgList").innerHTML = L.map(a => {
      const r = sg[key(a)] || { s: 0, c: 0, n: 0 }, h = hue(a[1]);
      return `<button class="sg-it" data-i="${AR.indexOf(a)}"><div class="sg-av" style="background:linear-gradient(145deg,hsl(${h} 65% 55%),hsl(${h} 70% 38%))">${ex(a[0][0].toUpperCase())}</div><span class="sg-n" dir="auto">${ex(a[0])}</span><span class="sg-s">${stars(r.s)}</span><span class="sg-b">${r.n ? `שיא: ${r.c}/${r.n}` : "עוד לא שוחק"}</span></button>`;
    }).join("") || '<p class="sm">לא נמצאו זמרים</p>';
    [...$("sgList").children].forEach(d => { if (d.dataset.i) d.onclick = () => start(+d.dataset.i); });
  }

  // ===== התחלת שלב של זמר =====
  async function start(i) {
    if (busy) return; busy = true;
    const a = AR[i], msg = $("sgMsg");
    msg.style.color = "var(--mu)"; msg.textContent = `טוען שירים של ${a[0]}...`;
    try {
      const songs = await songsOf(a);
      if (songs.length < 3) { msg.style.color = ""; msg.textContent = "לא נמצאו מספיק שירים לזמר הזה."; return; }
      const q = shuffle(songs.slice());
      S = { active: true, a, i, k: key(a), queue: q, songs, N: Math.min(PER_STAGE, q.length), done: 0, ok: 0, pts: 0 };
      mode = "singer"; seenT = new Set();
      $("genFW").hidden = true; msg.textContent = "";
      rebuildPool();
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
    S.N = S.done; summary();   // נגמרו השירים לפני הזמן
  }

  function leave() { S.active = false; mode = "free"; lid++; stop(); rebuildPool(); }

  function summary() {
    const n = S.N, ok = S.ok;
    const st = !n ? 0 : ok >= Math.ceil(n * R3) ? 3 : ok >= Math.ceil(n * R2) ? 2 : ok >= Math.ceil(n * R1) ? 1 : 0;
    let best = false;
    const u = user();
    if (u && n) {
      u.sg = u.sg || {};
      const p = u.sg[S.k] || { s: 0, c: 0, n: 0, b: 0 };
      best = ok > p.c || !p.n;
      u.sg[S.k] = { s: Math.max(p.s, st), c: best ? ok : p.c, n: best ? n : p.n, b: Math.max(p.b || 0, S.pts) };
      try { saveUser(); } catch (e) {}
    }
    const a = S.a, i = S.i;
    leave();
    sum.innerHTML = `<div class="card" style="text-align:center">
<div class="res" style="color:var(--${st ? "ok" : "bad"})">${st ? "🎉 כל הכבוד!" : "😔 לא הפעם"}</div>
<div style="font-size:34px">${stars(st)}</div>
<div style="font-size:20px;font-weight:600;margin-top:6px" dir="auto">${ex(a[0])}</div>
<p class="sm" style="font-size:14px">ניחשת ${ok} מתוך ${n} שירים · ${S.pts} נקודות${best && ok ? " · 🏅 שיא חדש!" : ""}</p></div>
<div class="row"><button class="b p" id="sgAgain">שחק שוב</button></div>
<div class="row" style="margin-top:8px"><button class="b" id="sgToList">לרשימת הזמרים</button></div>`;
    $("sgAgain").onclick = () => start(i);
    $("sgToList").onclick = () => { renderSingers(); show("sSingers"); };
    show("sSingerSum");
  }

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

  const oSet = window.setGH;
  window.setGH = function () {
    if (S.active) { $("gh").textContent = `🎤 ${S.a[0]} · שיר ${Math.min(over ? S.done : S.done + 1, S.N)}/${S.N} · ${S.pts} נק׳`; return; }
    return oSet.apply(this, arguments);
  };

  const oRB = window.rebuildPool;       // השלמה אוטומטית: רק שירי הזמר
  window.rebuildPool = function () {
    oRB.apply(this, arguments);
    if (S.active) { pool = S.songs.map(s => s.n + " - " + s.a); $("pool").textContent = ""; }
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
