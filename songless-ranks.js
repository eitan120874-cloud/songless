/* Songless – מערכת דרגות (50 דרגות)
 * קובץ עצמאי. נטען אחרי הסקריפט הראשי ב-index.html.
 * אין כאן ניקוד חדש: הדרגה נגזרת מ-U.points הקיים (סכום שיאי השלבים, 0–2500).
 * שום דבר לא נשמר ב-Firebase, הדרגה מחושבת בזמן אמת, אז נתוני שחקנים קיימים לא נפגעים.
 */
(function () {
  "use strict";

  const NAMES = ["אוזן מוזיקלית","מתחילים לזמזם","צייד הלהיטים","שיר מוכר","תותח הפזמונים","מלך הפלייליסט","זיכרון מוזיקלי","מזהה הצלילים","מכונת להיטים","אלוף הרדיו","חובב מוזיקה","שומע הכול","צייד המילים","מומחה הפזמונים","אולפן הלהיטים","גאון מוזיקלי","שומר הקצב","מפצח המנגינות","אשף השירים","אגדה מקומית","DJ מקצועי","מפלצת המוזיקה","מאסטר הפזמונים","מוח מוזיקלי","גורו המוזיקה","צייד הלהיטים האבודים","אוזן של זהב","פרופסור למוזיקה","מכונת זיהוי אנושית","קיסר המנגינות","מפענח הצלילים","שובר המצעדים","אגדה מוזיקלית","שליט הפלייליסט","המוח שמאחורי הביט","צליל בלתי נשכח","מפלצת הזיהוי","גאון התווים","שומע מעבר לזמן","אלוף האלופים","מיתוס המוזיקה","מלך המנגינות","האלגוריתם האנושי","אוזן על־אנושית","בלתי ניתן להטעיה","אגדה חיה","שובר המציאות","אל המוזיקה","המוח המוזיקלי האולטימטיבי","אלוף ה-SONGLESS"];
  const ICONS = ["👂","🎶","🏹","🎵","🔥","👑","💭","🔔","⚙️","📻","🎧","🦻","🔍","📜","🎚️","💡","🥁","🔓","🧙","🏛️","💿","👹","🎼","🧬","🧘","🗝️","🏅","🎓","🤖","🏰","🔬","📈","🌟","🎛️","🎹","🔮","🦖","🎻","⏳","🏆","🗿","🦁","🧮","🛸","🛡️","🐉","💥","⚡","🌌","💎"];

  // [דרגה אחרונה בקבוצה, שם הקבוצה, גוון HSL]
  const TIERS = [[10,"מתחילים",145],[20,"מקצוענים",215],[30,"מומחים",268],[40,"מאסטרים",28],[49,"אגדות",0],[50,"אלופי Songless",45]];

  // עקומת הסף: ריבועית-מעלה, כך שהדרגות הראשונות מגיעות מהר והאחרונות דורשות משחק כמעט מושלם.
  // הניקוד המקסימלי במשחק הוא 2500 (5 שלבים × 5 שירים × 100). דרגה 50 דורשת 2200.
  const MAXPTS = 2200, EXP = 1.8;

  const RANKS = [];
  let prev = 0;
  for (let n = 1; n <= 50; n++) {
    const ti = TIERS.findIndex(t => n <= t[0]), tr = TIERS[ti];
    const start = ti ? TIERS[ti - 1][0] + 1 : 1, len = tr[0] - start + 1;
    const k = len > 1 ? (n - start) / (len - 1) : 0;
    const min = n === 1 ? 0 : Math.max(prev + 5, Math.round(MAXPTS * Math.pow((n - 1) / 49, EXP) / 5) * 5);
    prev = min;
    const gold = n === 50;
    RANKS.push({
      n, name: NAMES[n - 1], icon: ICONS[n - 1], min, tier: tr[1],
      color:  gold ? "#ffd34d" : `hsl(${tr[2]} ${Math.round(62 + 23 * k)}% ${Math.round(56 - 6 * k)}%)`,
      color2: gold ? "#e09a00" : `hsl(${tr[2]} ${Math.round(70 + 22 * k)}% ${Math.round(40 - 6 * k)}%)`
    });
  }

  const pts = () => (typeof U !== "undefined" && U && Number(U.points)) || 0;
  const rankOf = p => { let r = RANKS[0]; for (const x of RANKS) if (p >= x.min) r = x; else break; return r; };
  const $ = id => document.getElementById(id);
  const cv = r => `--c1:${r.color};--c2:${r.color2}`;
  const badge = (r, s) => `<div class="rk-b" style="${cv(r)};--s:${s}px"><span>${r.icon}</span></div>`;

  // ===== עיצוב =====
  const css = document.createElement("style");
  css.textContent = `
.rk-card{position:relative;overflow:hidden;background:var(--cd);border:1px solid var(--bd);border-radius:14px;padding:16px;margin-bottom:14px;text-align:start}
.rk-card::before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--c1),var(--c2))}
.rk-top{display:flex;align-items:center;gap:12px}
.rk-b{width:var(--s);height:var(--s);flex:none;border-radius:50%;display:grid;place-items:center;background:linear-gradient(145deg,var(--c1),var(--c2));box-shadow:0 4px 14px color-mix(in srgb,var(--c2) 45%,transparent),inset 0 0 0 2px rgba(255,255,255,.28);font-size:calc(var(--s) * .5);line-height:1}
.rk-nm{font-size:19px;font-weight:700;line-height:1.25}
.rk-sub{font-size:12px;color:var(--mu);margin-top:2px}
.rk-bar{height:10px;border-radius:5px;background:var(--bd);overflow:hidden;margin:14px 0 10px}
.rk-bar i{display:block;height:100%;border-radius:5px;background:linear-gradient(90deg,var(--c1),var(--c2));transition:width .8s ease}
.rk-nx{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--mu)}
.rk-nx b{color:var(--tx);font-size:14px}
.rk-nx .rk-b{opacity:.75}
.rk-link{margin-inline-start:auto;border:0;background:none;color:var(--ac);font-size:13px;cursor:pointer;padding:6px 0}
.rk-ov{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;padding:16px;padding-top:max(16px,env(safe-area-inset-top));padding-bottom:max(16px,env(safe-area-inset-bottom));overflow:hidden}
.rk-md{position:relative;background:var(--cd);color:var(--tx);border:1px solid var(--bd);border-radius:20px;width:100%;max-width:420px;max-height:86vh;overflow:auto;padding:22px 18px;text-align:center;animation:rkpop .5s cubic-bezier(.2,1.4,.4,1)}
.rk-md h2{margin:0 0 6px;font-size:24px}
.rk-up .rk-b{margin:10px auto;animation:rkglow 1.8s ease-in-out infinite}
.rk-arrow{font-size:14px;color:var(--mu);margin:4px 0 10px}
.rk-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--bd);border-radius:12px;margin-bottom:6px;text-align:start;font-size:14px}
.rk-row .n{color:var(--mu);font-size:12px;min-width:24px}
.rk-row .p{margin-inline-start:auto;color:var(--mu);font-size:12px;white-space:nowrap}
.rk-row.lock{opacity:.45}
.rk-row.cur{border-color:var(--c1);background:color-mix(in srgb,var(--c1) 16%,transparent);font-weight:600}
.rk-tt{font-size:12px;color:var(--mu);margin:12px 0 6px;text-align:start}
.rk-cf{position:absolute;top:-30px;font-style:normal;pointer-events:none;animation:rkfall 2.6s linear forwards}
@keyframes rkpop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes rkglow{50%{box-shadow:0 0 34px var(--c1),inset 0 0 0 2px rgba(255,255,255,.4);transform:scale(1.06)}}
@keyframes rkfall{to{transform:translateY(110vh) rotate(360deg);opacity:0}}
@media (prefers-reduced-motion:reduce){.rk-md,.rk-up .rk-b,.rk-cf{animation:none}.rk-cf{display:none}.rk-bar i{transition:none}}
`;
  document.head.appendChild(css);

  // ===== תצוגה =====
  function card() {
    const p = pts(), r = rankOf(p), nx = RANKS[r.n];
    const pct = nx ? Math.max(0, Math.min(100, Math.round((p - r.min) / (nx.min - r.min) * 100))) : 100;
    return `<div class="rk-card" style="${cv(r)}">
<div class="rk-top">${badge(r, 64)}<div><div class="rk-nm">${r.name}</div><div class="rk-sub">דרגה ${r.n} מתוך 50 · ${r.tier} · ${p} נק׳</div></div></div>
<div class="rk-bar"><i style="width:${pct}%"></i></div>
${nx ? `<div class="rk-nx">${badge(nx, 34)}<div>הדרגה הבאה<br><b>${nx.name}</b></div><div style="margin-inline-start:auto;text-align:end">עוד <b>${nx.min - p}</b> נק׳<br>${p}/${nx.min}</div></div>`
     : `<div class="rk-nx"><div>🏆 הגעת לדרגה הגבוהה ביותר במשחק!</div></div>`}
<button class="rk-link" data-rk="all">כל 50 הדרגות ›</button></div>`;
  }

  function mount() {
    const h = $("hi"); if (!h || typeof U === "undefined" || !U) return;
    let c = $("rkCard");
    if (!c) { c = document.createElement("div"); c.id = "rkCard"; h.closest(".card").after(c); }
    c.innerHTML = card();
  }

  function overlay(html, cls) {
    closeOv();
    const o = document.createElement("div");
    o.className = "rk-ov"; o.id = "rkOv";
    o.innerHTML = `<div class="rk-md ${cls || ""}">${html}</div>`;
    o.addEventListener("click", e => { if (e.target === o || e.target.closest("[data-rk=close]")) closeOv(); });
    document.body.appendChild(o);
    return o;
  }
  function closeOv() { const o = $("rkOv"); if (o) o.remove(); }
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeOv(); });
  document.addEventListener("click", e => { if (e.target.closest("[data-rk=all]")) openAll(); });

  function openAll() {
    const p = pts(), cur = rankOf(p); let last = "";
    const rows = RANKS.map(r => {
      const head = r.tier !== last ? `<div class="rk-tt">${r.tier}</div>` : ""; last = r.tier;
      return head + `<div class="rk-row ${r.n === cur.n ? "cur" : r.min > p ? "lock" : ""}" style="${cv(r)}"><span class="n">${r.n}</span>${badge(r, 30)}<span>${r.name}</span><span class="p">${r.min} נק׳</span></div>`;
    }).join("");
    const o = overlay(`<h2>🎖️ כל הדרגות</h2><div class="sm" style="margin-bottom:6px">הדרגה נקבעת לפי הניקוד הכולל שלך בטבלה</div>${rows}<button class="b p" data-rk="close" style="width:100%;margin-top:10px">סגור</button>`);
    const c = o.querySelector(".cur"); if (c) c.scrollIntoView({ block: "center" });
  }

  function levelUp(a, b) {
    const nx = RANKS[b.n], jump = b.n - a.n;
    const o = overlay(`<div style="${cv(b)}"><h2>🎉 עלית דרגה!</h2>
${badge(b, 96)}
<div class="rk-nm" style="font-size:24px">${b.name}</div>
<div class="rk-sub">דרגה ${b.n} מתוך 50 · ${b.tier}</div>
<div class="rk-arrow">${a.icon} ${a.name} ← ${b.icon} ${b.name}${jump > 1 ? `<br>קפצת ${jump} דרגות בבת אחת!` : ""}</div>
<div class="sm" style="font-size:14px;margin-bottom:12px">${nx ? `היעד הבא: ${nx.icon} ${nx.name}, עוד ${nx.min - pts()} נקודות` : "אתה אלוף ה-SONGLESS! 👑"}</div>
<button class="b p" data-rk="close" style="width:100%">המשך</button></div>`, "rk-up");
    for (let i = 0; i < 24; i++) {
      const s = document.createElement("i"); s.className = "rk-cf"; s.textContent = ["✨", "🎵", "🎶", "⭐"][i % 4];
      s.style.cssText = `left:${Math.random() * 100}%;animation-delay:${Math.random() * .9}s;font-size:${14 + Math.random() * 16}px`;
      o.appendChild(s);
    }
    if (navigator.vibrate) try { navigator.vibrate([60, 40, 90]); } catch (e) {}
  }

  // ===== חיבור לפונקציות הקיימות (עטיפה, בלי לשנות אותן) =====
  const oHome = window.renderHome;
  if (typeof oHome === "function") window.renderHome = function () {
    const r = oHome.apply(this, arguments); try { mount(); } catch (e) {} return r;
  };

  const oSum = window.showSum;
  if (typeof oSum === "function") window.showSum = function () {
    const before = rankOf(pts());                    // לפני שהשלב מעדכן את U.points
    const r = oSum.apply(this, arguments);
    try {
      const old = $("rkSum"); if (old) old.remove();
      const body = $("sumBody"); if (body) body.insertAdjacentHTML("afterend", `<div id="rkSum">${card()}</div>`);
      const after = rankOf(pts());
      if (after.n > before.n) levelUp(before, after);
    } catch (e) {}
    return r;
  };
  // הסרת כרטיס הדרגה הישן ממסך הסיכום כשמתחילים שלב חדש
  document.addEventListener("click", () => { const s = $("rkSum"); if (s && $("sSum").hidden) s.remove(); }, true);

  window.SLRanks = { RANKS, rankOf, refresh: mount };
  try { mount(); } catch (e) {}   // אם המשתמש כבר מחובר לפני שהקובץ נטען
})();
