/* Songless – מאגר שירים שמור (songs.json)
 * טוען את השירים מקובץ songs.json שבריפו במקום לפנות ל-iTunes בכל כניסה.
 * אם הקובץ חסר, או שלזמר מסוים אין בו שירים, המשחק ממשיך לעבוד כמו קודם ושולף מ-iTunes.
 * הקובץ נבנה בעזרת build-songs.html.
 */
(function () {
  "use strict";
  if (typeof AR === "undefined" || typeof cache === "undefined" || typeof songsOf !== "function") return;

  const P = "https://audio-ssl.itunes.apple.com/itunes-assets/";
  let DATA = null;
  const memo = {};

  function get(a) {
    if (!DATA) return null;
    const rows = DATA.a[a[1]];
    if (!rows || !rows.length) return null;
    return memo[a[1]] || (memo[a[1]] = rows.map((r, i) => ({
      id: r[0], n: r[1], f: r[2] || r[1], a: a[0],
      u: /^http/.test(r[3]) ? r[3] : P + r[3], r: i
    })));
  }

  function install() {
    for (const a of AR) { const s = get(a); if (s) cache[a[1]] = { t: Date.now(), s }; }   // בזיכרון בלבד, לא נכתב ל-localStorage
    try { rebuildPool(); } catch (e) {}
  }

  const ready = fetch("songs.json", { cache: "no-cache" })
    .then(r => r.ok ? r.json() : null)
    .then(j => { if (j && j.a) { DATA = j; install(); } })
    .catch(() => {});

  const orig = window.songsOf;
  window.songsOf = async function (a) {
    await ready;
    const s = get(a);
    if (s) { const c = cache[a[1]]; if (!c || c.s !== s) cache[a[1]] = { t: Date.now(), s }; return s; }
    return orig.apply(this, arguments);
  };

  window.SLSongs = { ready, get, info: () => DATA && { builtAt: DATA.t, artists: Object.keys(DATA.a).length } };
})();
