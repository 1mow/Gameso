// Логика комнаты. Работает только в браузере хоста; хост сам тоже игрок (его экран получает сообщения напрямую).
G.Host = (() => {
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const R = { players: {}, order: [], S: Object.assign({}, G.DEF), phase: 'lobby', code: '', hp: '' };
  let T = null, C = null, M = null;
  const VT = 20; // секунд на оценку одного мема

  const clr = () => { clearTimeout(T); T = null; };
  const later = (f, s) => { clr(); T = setTimeout(f, s * 1000); };
  const P = i => R.players[i], pl = () => R.order.map(P), on = () => pl().filter(p => p.on);
  const who = i => { const p = P(i); return p ? { n: p.name, e: p.emoji, c: p.color } : { n: 'Losowe hasło', e: '🎲', c: '#a9a5e6' }; };

  function send(i, m) {
    const p = P(i); if (!p) return;
    if (m.t === 'screen') p.last = m;
    if (i === R.hp) G.app.onMsg(m);
    else if (p.conn && p.conn.open) { try { p.conn.send(m); } catch (e) {} }
  }
  const bc = m => R.order.forEach(i => send(i, m));
  const lobby = () => ({ t: 'screen', screen: 'lobby', code: R.code, hp: R.hp, S: R.S, pl: pl().map(p => Object.assign({ id: p.id, on: p.on }, who(p.id))) });

  const NUMS = { write: [10, 300], draw: [20, 600], hide: [0, 60], rounds: [1, 12], mtime: [10, 300] };
  function clean(s) {
    const o = {};
    for (const k in s) {
      if (k === 'game') { if (['phone', 'gartic', 'memer'].includes(s[k])) o.game = s[k]; }
      else if (k === 'random') o.random = !!s[k];
      else if (NUMS[k] && Number.isFinite(+s[k])) o[k] = Math.min(NUMS[k][1], Math.max(NUMS[k][0], +s[k]));
    }
    return o;
  }

  // ---------- подключения ----------
  function init(code, me) {
    R.code = code; R.hp = me.pid;
    R.players[me.pid] = { id: me.pid, name: me.name, emoji: me.emoji, color: G.C[0], on: true, pts: 0 };
    R.order = [me.pid];
    send(me.pid, lobby());
  }

  function onConn(c, m) {
    if (!m || typeof m !== 'object') return;
    if (m.t === 'hello') {
      const pid = String(m.pid || '').slice(0, 40); if (!pid) return;
      let p = P(pid);
      if (!p) {
        if (R.phase !== 'lobby') { c.send({ t: 'err', m: 'Gra już trwa. Wpadnij, gdy się skończy.' }); return; }
        if (R.order.length >= 12) { c.send({ t: 'err', m: 'W pokoju jest już 12 graczy.' }); return; }
        const base = String(m.name || 'Gracz').trim().slice(0, 14) || 'Gracz';
        let name = base, k = 2;
        while (pl().some(q => q.name === name)) name = base + k++;
        p = R.players[pid] = { id: pid, name, emoji: String(m.emoji || '🙂').slice(0, 4), color: G.C[R.order.length % G.C.length], on: true, pts: 0 };
        R.order.push(pid);
      }
      p.on = true; p.conn = c; c.pid = pid;
      if (R.phase === 'lobby') bc(lobby());
      else if (C && C.rv && p.last && p.last.screen === 'reveal') send(pid, rmsg(true));
      else if (p.last) send(pid, p.last);
      return;
    }
    if (c.pid) recv(c.pid, m);
  }

  function onClose(c) {
    const p = P(c.pid);
    if (!p || p.conn !== c) return;
    p.on = false; p.conn = null;
    if (R.phase === 'lobby') {
      bc(lobby());
      setTimeout(() => {
        if (!p.on && R.phase === 'lobby' && P(p.id)) { R.order = R.order.filter(i => i !== p.id); delete R.players[p.id]; bc(lobby()); }
      }, 4000);
    } else setTimeout(() => { if (!p.on) left(p.id); }, 8000);
  }

  function left(pid) {
    if (R.phase === 'lobby') return;
    if (on().length < 2) { bc({ t: 'toast', m: 'Został jeden gracz. Wracamy do poczekalni' }); return toLobby(); }
    if (C && !C.rv && C.ord.includes(pid) && !C.sub[pid]) { put(pid, null); cdone(); }
    if (M) { if (M.ph === 'write') mcheck(); else if (M.ph === 'vote') vcheck(); }
  }

  function recv(pid, m) {
    const host = pid === R.hp;
    switch (m.t) {
      case 'set': if (host && R.phase === 'lobby') { Object.assign(R.S, clean(m.S || {})); bc(lobby()); } break;
      case 'start': if (host && R.phase === 'lobby' && on().length >= 2) start(); break;
      case 'sub': if (R.phase === 'memer') msub(pid, m.d); else if (C) csub(pid, m.d); break;
      case 'vote': vote(pid, m.v); break;
      case 'react': bc({ t: 'fx', e: String(m.e || '').slice(0, 4) }); break;
      case 'next': if (host) next(); break;
      case 'lobby': if (host && R.phase !== 'lobby') toLobby(); break;
    }
  }

  function start() {
    R.order = R.order.filter(i => P(i).on);
    R.phase = R.S.game;
    if (R.S.game === 'memer') mstart(); else cstart();
  }

  function toLobby() {
    clr(); C = M = null; R.phase = 'lobby';
    R.order = R.order.filter(i => P(i).on || i === R.hp);
    Object.keys(R.players).forEach(k => { if (!R.order.includes(k)) delete R.players[k]; });
    bc(lobby());
  }

  // ---------- цепочные игры: Глухой телефон и Gartic Phone ----------
  // Цепочка c на шаге s лежит у игрока (c+s) mod n, то есть листы идут по кругу.
  const co = pid => ((C.ord.indexOf(pid) - C.s) % C.n + C.n) % C.n;
  const put = (pid, d) => { C.ch[co(pid)].e[C.s] = { by: pid, kind: C.kind, data: d }; C.sub[pid] = 1; };

  function cstart() {
    const ord = shuffle(R.order.slice());
    C = { ord, n: ord.length, ch: ord.map(o => ({ o, e: [] })), s: 0, sub: {}, rv: null };
    if (R.S.random) {
      const ph = shuffle(G.P.slice());
      C.ch.forEach((c, i) => c.e.push({ by: null, kind: 'text', data: ph[i % ph.length] }));
      C.s = 1;
    }
    step();
  }

  function waitMsg(done, n, w) { return { t: 'screen', screen: 'wait', done, n, w: w.map(who) }; }

  function step() {
    const g = R.S.game, s = C.s;
    C.kind = g === 'gartic' && s % 2 ? 'draw' : 'text';
    C.sub = {};
    const dur = C.kind === 'draw' ? R.S.draw : R.S.write;
    C.ord.forEach(pid => { if (!P(pid).on) put(pid, null); });
    C.ord.forEach(pid => {
      if (C.sub[pid]) return;
      const e = s ? C.ch[co(pid)].e[s - 1] : null;
      send(pid, { t: 'screen', screen: 'task', kind: C.kind, dur, s, n: C.n, hide: g === 'phone' ? R.S.hide : 0, prev: e ? { kind: e.kind, data: e.data } : null });
    });
    if (!cdone()) later(() => { C.ord.forEach(p => { if (!C.sub[p]) put(p, null); }); adv(); }, dur + 6);
  }

  function csub(pid, d) {
    if (!C || C.rv || C.sub[pid] || !C.ord.includes(pid)) return;
    if (C.kind === 'text') d = String(d || '').trim().slice(0, 140) || '…';
    else if (typeof d !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(d) || d.length > 700000) d = null;
    put(pid, d);
    const m = waitMsg(Object.keys(C.sub).length, C.n, C.ord.filter(p => !C.sub[p] && P(p).on));
    Object.keys(C.sub).forEach(p => send(p, m));
    cdone();
  }

  function cdone() { if (C.ord.every(p => C.sub[p])) { adv(); return true; } return false; }
  function adv() { clr(); C.s++; if (C.s >= C.n) { C.rv = { ci: 0, k: 1 }; bc(rmsg()); } else step(); }

  function rmsg(full) {
    const r = C.rv, c = C.ch[r.ci], x = c.e[r.k - 1];
    const view = y => ({ kind: y.kind, data: y.data, by: who(y.by) });
    return { t: 'screen', screen: 'reveal', ci: r.ci, n: C.n, o: who(c.o), k: r.k, tot: c.e.length, end: r.ci === C.n - 1 && r.k === c.e.length, add: view(x), all: full ? c.e.slice(0, r.k).map(view) : null };
  }

  function next() {
    if (!C || !C.rv) return;
    const r = C.rv, c = C.ch[r.ci];
    if (r.k < c.e.length) r.k++;
    else if (r.ci < C.n - 1) { r.ci++; r.k = 1; }
    else return toLobby();
    bc(rmsg());
  }

  // ---------- Мемер ----------
  function mstart() {
    M = { t: shuffle(G.T.slice()), r: 0, sc: {} };
    R.order.forEach(i => M.sc[i] = 0);
    mround();
  }

  function mround() {
    M.r++; M.tpl = M.t[(M.r - 1) % M.t.length]; M.m = {}; M.ph = 'write'; M.g = {};
    R.order.forEach(i => M.g[i] = 0);
    bc({ t: 'screen', screen: 'meme', tpl: M.tpl, dur: R.S.mtime, r: M.r, rs: R.S.rounds });
    later(mfin, R.S.mtime + 6);
  }

  function msub(pid, d) {
    if (!M || M.ph !== 'write' || M.m[pid] || !P(pid)) return;
    const f = x => String(x || '').trim().slice(0, 90);
    d = d || {};
    M.m[pid] = { top: f(d.top), bot: f(d.bot) };
    const m = waitMsg(Object.keys(M.m).length, R.order.length, R.order.filter(i => !M.m[i] && P(i).on));
    Object.keys(M.m).forEach(i => send(i, m));
    mcheck();
  }

  function mcheck() { if (on().every(p => M.m[p.id])) mfin(); }

  function mfin() {
    if (!M || M.ph !== 'write') return;
    clr(); M.ph = 'vote';
    M.list = shuffle(Object.keys(M.m).filter(i => M.m[i].top || M.m[i].bot));
    M.i = -1; mnext();
  }

  function mnext() {
    M.i++;
    if (M.i >= M.list.length) return mboard();
    M.cur = M.list[M.i]; M.v = {}; M.rev = false; M.t0 = Date.now();
    mshow(); later(mrev, VT); vcheck();
  }

  function mshow() {
    const m = M.m[M.cur], vs = Object.values(M.v), sum = vs.reduce((a, b) => a + b, 0);
    const need = on().filter(p => p.id !== M.cur).length;
    R.order.forEach(i => send(i, {
      t: 'screen', screen: 'present', tpl: M.tpl, top: m.top, bot: m.bot, i: M.i + 1, n: M.list.length, r: M.r, rs: R.S.rounds,
      mine: i === M.cur, voted: M.v[i] || 0, rev: M.rev, by: M.rev ? who(M.cur) : null,
      avg: vs.length ? sum / vs.length : 0, sum, cnt: vs.length, need, left: Math.max(1, Math.round(VT - (Date.now() - M.t0) / 1000))
    }));
  }

  function vote(pid, v) {
    if (!M || M.ph !== 'vote' || M.rev || pid === M.cur || M.v[pid] || !P(pid)) return;
    M.v[pid] = Math.min(5, Math.max(1, v | 0));
    mshow(); vcheck();
  }

  function vcheck() { if (M.ph === 'vote' && !M.rev && on().filter(p => p.id !== M.cur).every(p => M.v[p.id])) mrev(); }

  function mrev() {
    if (M.rev) return;
    M.rev = true; clr();
    const s = Object.values(M.v).reduce((a, b) => a + b, 0);
    M.sc[M.cur] += s; M.g[M.cur] += s;
    mshow(); later(mnext, 4.5);
  }

  function mboard() {
    M.ph = 'board'; clr();
    const fin = M.r >= R.S.rounds;
    const rank = R.order.map(i => Object.assign({}, who(i), { pts: M.sc[i], g: M.g[i] })).sort((a, b) => b.pts - a.pts);
    bc({ t: 'screen', screen: 'board', r: M.r, rs: R.S.rounds, rank, fin });
    if (!fin) later(mround, 7);
  }

  return { init, onConn, onClose, recv };
})();
if (typeof module !== 'undefined') module.exports = G.Host;
