(() => {
  const $ = s => document.querySelector(s), esc = G.esc, A = {}, V = {};
  G.base = location.pathname.replace(/[^\/]*$/, '');           // np. /gameso/
  const ROOM = (new URLSearchParams(location.search).get('r') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (location.search) history.replaceState(null, '', G.base);

  let sv = {}; try { sv = JSON.parse(localStorage.getItem('gs-me') || '{}'); } catch (e) {}
  let pid = sessionStorage.getItem('gs-pid');
  if (!pid) { pid = Math.random().toString(36).slice(2, 12); sessionStorage.setItem('gs-pid', pid); }
  const me = { pid, name: sv.name || '', emoji: sv.emoji || G.E[Math.random() * G.E.length | 0] };
  let code = '', isHost = false, tm = null, tos = [], cur = null, acc = [], pad = null, lastR = 0, nPl = 0;

  const save = () => localStorage.setItem('gs-me', JSON.stringify({ name: me.name, emoji: me.emoji }));
  const stop = () => { clearInterval(tm); tos.forEach(clearTimeout); tos = []; };
  const put = (h, keep) => { stop(); pad = null; $('#app').innerHTML = `<div class="scr">${h}</div>`; if (!keep) scrollTo(0, 0); };
  const send = m => isHost ? G.Host.recv(me.pid, m) : G.net.send(m);
  const chip = (p, cls) => `<span class="pl ${cls || ''} ${p.on === false ? 'off' : ''}" style="--c:${p.c}"><span class="e">${p.e}</span><b>${esc(p.n)}</b></span>`;
  const rx = () => `<div class="rx">${['😂', '🔥', '💀', '👏', '❤️'].map(e => `<button data-a="react" data-e="${e}" aria-label="Reakcja ${e}">${e}</button>`).join('')}</div>`;

  function top() {
    $('#top').innerHTML = `<span class="mini">gameso</span>${code ? `<button class="code" data-a="copy" title="Skopiuj link">${code} ⧉</button>` : ''}<span class="sp"></span><button class="ib" data-a="snd" aria-label="Dźwięk">${G.snd ? '🔊' : '🔇'}</button>`;
  }

  function timer(dur, end) {
    const bar = $('#bar'), num = $('#num'); if (!bar) return;
    const t0 = Date.now();
    bar.style.transition = 'none'; bar.style.width = '100%'; bar.getBoundingClientRect();
    bar.style.transition = `width ${dur}s linear`; bar.style.width = '0%';
    let last = -1;
    tm = setInterval(() => {
      const l = Math.max(0, Math.ceil(dur - (Date.now() - t0) / 1000));
      if (l !== last) {
        last = l; if (num) num.textContent = l + ' s';
        if (l <= 10) bar.parentNode.classList.add('hot');
        if (l <= 5 && l > 0) G.sfx('tick');
      }
      if (l <= 0) { clearInterval(tm); end(); }
    }, 250);
  }

  // ---------- wejście ----------
  function hello() {
    top();
    put(`<section class="hero"><h1 class="logo" aria-label="gameso">${[...'gameso'].map((c, i) => `<i style="--n:${i};--r:${[-6, 4, -3, 6, -5, 3][i]}deg;--c:${G.C[i]}">${c}</i>`).join('')}</h1>
<p class="lead">${ROOM ? `Zaproszono cię do pokoju <b>${ROOM}</b>. Wpisz nick i już jesteś w środku.` : 'Głuchy telefon, Gartic Phone i memy. Gramy ze znajomymi prosto w przeglądarce.'}</p>
<div class="who"><button class="av" data-a="emoji" aria-label="Zmień awatar">${me.emoji}</button><input id="nick" maxlength="14" placeholder="Jak masz na imię?" value="${esc(me.name)}" autocomplete="off"></div>
<button class="btn pink big" data-a="go">${ROOM ? 'Wejdź do pokoju' : 'Dalej'}</button></section>`);
    $('#nick').addEventListener('keydown', e => e.key === 'Enter' && A.go());
    if (!me.name) $('#nick').focus();
  }

  function menu() {
    put(`<section><div class="who sm"><span class="av">${me.emoji}</span><b>${esc(me.name)}</b><button class="ghostlink" data-a="rename">zmień</button></div>
<div class="two"><div class="card"><h2>Utwórz pokój</h2><p class="mute">Wybierzesz grę i ustawienia, a znajomym wyślesz link.</p><button class="btn pink big" data-a="create">Utwórz</button></div>
<div class="card"><h2>Dołącz do pokoju</h2><p class="mute">Wpisz kod albo wklej link.</p><input id="rc" placeholder="Kod, np. K7MQ2" maxlength="80" autocomplete="off"><button class="btn mint big" data-a="join">Wejdź</button></div></div></section>`);
    $('#rc').addEventListener('keydown', e => e.key === 'Enter' && A.join());
  }

  const busy = t => put(`<div class="mid"><div class="spin">🎲</div><p>${t}</p></div>`);
  function fail(t) {
    G.net.close(); code = ''; isHost = false; top();
    put(`<div class="mid"><div class="big-e">😵</div><h2>${esc(t)}</h2><button class="btn big" style="max-width:320px;margin-left:auto;margin-right:auto" data-a="home">Na stronę główną</button></div>`);
  }
  const noPeer = () => typeof Peer === 'undefined' && (fail('Nie załadowała się biblioteka połączeń (PeerJS). Odśwież stronę i sprawdź internet.'), true);

  function create() {
    if (noPeer()) return;
    busy('Tworzymy pokój…');
    let n = 0;
    const t = () => {
      const c = Array.from({ length: 5 }, () => G.L[Math.random() * G.L.length | 0]).join('');
      G.net.host(c, e => {
        if (e) {
          if (e.type === 'unavailable-id' && n++ < 5) { try { G.net.p.destroy(); } catch (x) {} return t(); }
          return fail('Nie udało się utworzyć pokoju. Sprawdź internet i spróbuj jeszcze raz.');
        }
        isHost = true; code = c; history.replaceState(null, '', G.base + c);
        G.Host.init(c, me);
      });
    };
    t();
  }

  function join(c) {
    if (noPeer()) return;
    busy('Wchodzimy do pokoju…');
    let first = true;
    G.net.join(c, {
      open() {
        G.net.send({ t: 'hello', pid: me.pid, name: me.name, emoji: me.emoji });
        if (first) { first = false; history.replaceState(null, '', G.base + c); }
      },
      data: G.app.onMsg,
      lost() { G.toast('Połączenie zerwane, łączymy ponownie…'); },
      fail(r) { fail(r === 'nf' ? 'Nie znaleziono pokoju. Sprawdź kod i spróbuj ponownie.' : r === 'host' ? 'Utracono połączenie z hostem. Możliwe, że zamknął kartę.' : 'Nie udało się połączyć. Sprawdź internet.'); }
    });
  }

  // ---------- ekrany od hosta ----------
  const OPT = {
    write: ['Czas na hasło', [20, 45, 75, 120], v => v + ' s'],
    draw: ['Czas na rysunek', [45, 90, 150, 240], v => v + ' s'],
    hide: ['Ukryj hasło po', [0, 5, 10], v => v ? v + ' s' : 'nie ukrywaj'],
    random: ['Pierwsze hasło', [false, true], v => v ? 'losowe' : 'własne'],
    rounds: ['Liczba rund', [3, 4, 6, 8], v => v],
    mtime: ['Czas na mema', [30, 45, 75, 120], v => v + ' s']
  };
  const BY = { phone: ['write', 'hide', 'random'], gartic: ['write', 'draw', 'random'], memer: ['rounds', 'mtime'] };

  V.lobby = m => {
    code = m.code; isHost = m.hp === me.pid; top();
    if (nPl && m.pl.length > nPl) G.sfx('join');
    nPl = m.pl.length;
    const S = m.S, ready = m.pl.filter(p => p.on).length >= 2, dis = isHost ? '' : 'disabled';
    put(`<section><div class="card share"><div><small>Kod pokoju</small><div class="big-code">${m.code}</div></div><button class="btn mint" data-a="copy">Skopiuj link</button></div>
<h3>Gracze: ${m.pl.length}</h3><div class="pls">${m.pl.map(p => chip(p)).join('')}</div>
<h3>${isHost ? 'Wybierz grę' : 'Gra'}</h3><div class="games">${G.GAMES.map(g => `<button class="g ${S.game === g.id ? 'on' : ''}" style="--c:${g.c}" data-a="game" data-g="${g.id}" ${dis}><span class="ge">${g.e}</span><b>${g.n}</b><span>${g.d}</span></button>`).join('')}</div>
<div class="set">${BY[S.game].map(k => `<div class="opt"><span>${OPT[k][0]}</span><div class="chips">${OPT[k][1].map(v => `<button class="chip ${S[k] === v ? 'on' : ''}" data-a="set" data-k="${k}" data-v='${JSON.stringify(v)}' ${dis}>${OPT[k][2](v)}</button>`).join('')}</div></div>`).join('')}</div>
${isHost ? `<button class="btn pink big" data-a="start" ${ready ? '' : 'disabled'}>${ready ? 'Zacznij grę' : 'Potrzeba co najmniej 2 graczy'}</button>` : '<p class="mute c" style="margin-top:20px">Czekamy, aż host zacznie grę…</p>'}</section>`);
  };

  V.task = m => {
    cur = { k: m.kind, sent: false };
    const dr = m.kind === 'draw', p = m.prev, skip = p && p.data == null;
    let h, ctx = '';
    if (!p) h = 'Wymyśl hasło do łańcuszka';
    else if (dr) { h = 'Narysuj to'; ctx = skip ? '<div class="quote gone">Poprzedni gracz pominął turę. Rysuj, co chcesz.</div>' : `<div class="quote">„${esc(p.data)}”</div>`; }
    else {
      h = p.kind === 'draw' ? 'Co tu narysowano?' : 'Powtórz własnymi słowami';
      ctx = skip ? '<div class="quote gone">Poprzedni gracz pominął turę. Wymyśl coś sam.</div>'
        : p.kind === 'draw' ? `<img class="shot" src="${esc(p.data)}" alt="Rysunek">` : `<div class="quote" id="q">„${esc(p.data)}”</div>`;
    }
    put(`<div class="bar"><span id="bar"></span></div><div class="row"><span class="mute">Krok ${m.s + 1} z ${m.n}</span><b id="num"></b></div><h2>${h}</h2>${ctx}
${dr ? G.padHTML() : `<textarea id="txt" maxlength="140" rows="3" placeholder="${p ? 'Twoja wersja…' : 'Na przykład: kot, który boi się ogórków'}"></textarea>`}
<button class="btn pink big" data-a="submit">Gotowe</button>`);
    if (dr) pad = G.padInit($('.pad'));
    else {
      const t = $('#txt'); t.focus();
      t.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); A.submit(); } });
    }
    if (m.hide && p && p.kind === 'text' && !dr && !skip)
      tos.push(setTimeout(() => { const q = $('#q'); if (q) { q.textContent = '🙈 Hasło ukryte. Pisz z pamięci!'; q.classList.add('gone'); } }, m.hide * 1000));
    timer(m.dur, A.submit);
  };

  V.wait = m => {
    cur = { sent: true };
    put(`<div class="mid"><div class="spin">✅</div><h2>Gotowe!</h2><p class="mute">Odpowiedziało ${m.done} z ${m.n}</p>${m.w.length ? `<p class="mute">Czekamy na:</p><div class="pls c">${m.w.map(p => chip(p)).join('')}</div>` : ''}</div>`);
  };

  V.reveal = m => {
    cur = { k: 'x' };
    if (m.all) acc = m.all.slice();                 // powrót do gry w środku łańcuszka: dostajemy całość
    else { if (m.k === 1) acc = []; acc.push(m.add); }
    const lbl = (e, i) => i === 0 ? (e.by.e === '🎲' ? 'losowe hasło' : 'hasło') : e.kind === 'draw' ? 'rysunek' : acc[i - 1].kind === 'draw' ? 'opis' : 'przekaz';
    put(`<div class="row"><span class="mute">Łańcuszek ${m.ci + 1} z ${m.n}</span>${chip(m.o, 'sm')}</div>
${acc.map((e, i) => `<div class="ent ${i === acc.length - 1 ? 'new' : ''}"><span class="av s" style="--c:${e.by.c}">${e.by.e}</span><div><small>${esc(e.by.n)}: ${lbl(e, i)}</small>${e.kind === 'draw' ? (e.data ? `<img class="shot" src="${esc(e.data)}" alt="Rysunek">` : '<div class="bub mute">pominął turę</div>') : `<div class="bub">${esc(e.data)}</div>`}</div></div>`).join('')}
${rx()}
${isHost ? `<button class="btn pink big" data-a="next">${m.end ? 'Do poczekalni' : m.k < m.tot ? 'Dalej' : 'Następny łańcuszek'}</button>` : '<p class="mute c" style="margin-top:16px">Pokazuje host</p>'}`, true);
    const n = $('.ent.new'); if (n) n.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (m.end) { G.confetti(); G.sfx('win'); }
  };

  V.meme = m => {
    cur = { k: 'meme', sent: false };
    put(`<div class="bar"><span id="bar"></span></div><div class="row"><span class="mute">Runda ${m.r} z ${m.rs}</span><b id="num"></b></div><h2>Podpisz mema</h2>${G.meme(m.tpl, '', '')}
<input id="t1" maxlength="90" placeholder="Tekst na górze" autocomplete="off"><input id="t2" maxlength="90" placeholder="Tekst na dole (jeśli trzeba)" autocomplete="off">
<button class="btn pink big" data-a="submit">Gotowe</button>`);
    const bind = (i, el) => $(i).addEventListener('input', e => { el.textContent = e.target.value; el.setAttribute('style', G.fs(e.target.value)); });
    bind('#t1', $('.mt')); bind('#t2', $('.mb'));
    $('#t1').addEventListener('keydown', e => e.key === 'Enter' && $('#t2').focus());
    $('#t2').addEventListener('keydown', e => e.key === 'Enter' && A.submit());
    $('#t1').focus();
    timer(m.dur, A.submit);
  };

  V.present = m => {
    cur = { k: 'x' };
    const lab = ['💩', '😐', '🙂', '😂', '🔥'];
    put(`${m.rev ? '' : '<div class="bar"><span id="bar"></span></div>'}<div class="row"><span class="mute">Runda ${m.r} z ${m.rs}, mem ${m.i} z ${m.n}</span><b id="num"></b></div>${G.meme(m.tpl, m.top, m.bot)}
${m.rev ? `<div class="verdict">${chip(m.by)}<b>${m.cnt ? m.avg.toFixed(1) : '—'} z 5</b><span>+${m.sum} pkt</span></div>`
  : m.mine ? `<p class="c mute">To twój mem. Oceniło ${m.cnt} z ${m.need}</p>`
  : `<p class="c mute">Oceń mema. Zagłosowało ${m.cnt} z ${m.need}</p><div class="rates">${lab.map((l, i) => `<button class="rate ${m.voted === i + 1 ? 'on' : ''}" data-a="vote" data-v="${i + 1}" ${m.voted ? 'disabled' : ''}>${l}<small>${i + 1}</small></button>`).join('')}</div>`}
${rx()}`);
    if (m.rev) G.sfx('vote'); else timer(m.left, () => {});
  };

  V.board = m => {
    const mx = Math.max(1, ...m.rank.map(r => r.pts));
    put(`<h2 class="c">${m.fin ? 'Koniec gry' : `Wyniki rundy ${m.r} z ${m.rs}`}</h2>
${m.fin ? `<div class="win"><div class="crown">🏆</div>${chip(m.rank[0])}</div>` : ''}
<div class="rank">${m.rank.map((r, i) => `<div class="rk" style="--c:${r.c};--w:${r.pts / mx * 100}%"><span class="n">${i + 1}</span><span class="e">${r.e}</span><b>${esc(r.n)}</b><span class="rb"><i></i></span><b class="pt">${r.pts}</b>${r.g ? `<small>+${r.g}</small>` : ''}</div>`).join('')}</div>
${m.fin ? (isHost ? '<button class="btn pink big" data-a="lobby">Zagraj jeszcze raz</button>' : '<p class="mute c">Host decyduje, co dalej</p>') : '<p class="mute c">Następna runda zaraz się zacznie…</p>'}`);
    if (m.fin) { G.confetti(); G.sfx('win'); }
  };

  // ---------- akcje ----------
  A.emoji = b => { let e; do { e = G.E[Math.random() * G.E.length | 0]; } while (e === me.emoji); me.emoji = e; b.textContent = e; save(); G.sfx('pop'); };
  A.go = () => {
    const i = $('#nick'), v = i.value.trim();
    if (!v) { i.classList.remove('shake'); i.offsetWidth; i.classList.add('shake'); i.focus(); return; }
    me.name = v; save();
    ROOM ? join(ROOM) : menu();
  };
  A.rename = () => { hello(); };
  A.create = create;
  A.join = () => {
    const c = $('#rc').value.trim().replace(/.*[\/=]/, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length < 4) { G.toast('Wpisz kod pokoju'); return; }
    join(c);
  };
  A.copy = () => {
    const u = location.origin + G.base + code;
    (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(() => G.toast('Link skopiowany'), () => prompt('Skopiuj link:', u));
  };
  A.snd = () => { G.snd = !G.snd; localStorage.setItem('gs-snd', G.snd ? '1' : '0'); top(); };
  A.game = b => send({ t: 'set', S: { game: b.dataset.g } });
  A.set = b => send({ t: 'set', S: { [b.dataset.k]: JSON.parse(b.dataset.v) } });
  A.start = () => send({ t: 'start' });
  A.submit = () => {
    if (!cur || cur.sent) return;
    cur.sent = true;
    const d = cur.k === 'meme' ? { top: $('#t1').value, bot: $('#t2').value } : cur.k === 'draw' ? pad.data() : $('#txt').value;
    stop(); G.sfx('pop');
    const b = $('[data-a=submit]'); if (b) b.disabled = true;
    send({ t: 'sub', d });
  };
  A.vote = b => { send({ t: 'vote', v: +b.dataset.v }); b.classList.add('on'); G.sfx('vote'); };
  A.react = b => { if (Date.now() - lastR < 200) return; lastR = Date.now(); send({ t: 'react', e: b.dataset.e }); };
  A.next = () => send({ t: 'next' });
  A.lobby = () => send({ t: 'lobby' });
  A.home = () => { location.href = G.base; };

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-a]');
    if (b && A[b.dataset.a]) A[b.dataset.a](b);
  });

  G.app = {
    onMsg(m) {
      if (!m) return;
      if (m.t === 'screen') { if (V[m.screen]) V[m.screen](m); }
      else if (m.t === 'fx') G.fly(m.e);
      else if (m.t === 'toast') G.toast(m.m);
      else if (m.t === 'err') fail(m.m);
    }
  };

  hello();
})();
