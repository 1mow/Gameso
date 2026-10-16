(() => {
  G.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- звук ----------
  G.snd = localStorage.getItem('gs-snd') !== '0';
  let ac;
  G.sfx = k => {
    if (!G.snd) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const n = ac.currentTime;
      const t = (f, d, at = 0, ty = 'sine', v = .07) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = ty; o.frequency.value = f;
        g.gain.setValueAtTime(v, n + at);
        g.gain.exponentialRampToValueAtTime(.001, n + at + d);
        o.connect(g); g.connect(ac.destination);
        o.start(n + at); o.stop(n + at + d);
      };
      ({
        tick: () => t(880, .08, 0, 'square', .03),
        pop: () => { t(520, .1); t(780, .12, .08); },
        join: () => t(660, .15, 0, 'triangle'),
        vote: () => t(440 + Math.random() * 300, .1, 0, 'triangle'),
        win: () => [523, 659, 784, 1047].forEach((f, i) => t(f, .25, i * .12, 'triangle'))
      })[k]();
    } catch (e) {}
  };

  G.toast = m => {
    const t = document.getElementById('toast');
    t.textContent = m; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 2600);
  };

  // ---------- конфетти и реакции ----------
  G.confetti = () => {
    if (calm) return;
    const c = document.getElementById('fx'), x = c.getContext('2d');
    c.width = innerWidth; c.height = innerHeight;
    const cols = ['#ff4fa3', '#ffd23f', '#45e8b5', '#6ea8ff', '#ffffff'];
    const ps = Array.from({ length: 150 }, () => ({
      x: innerWidth / 2, y: innerHeight * .6, vx: (Math.random() - .5) * 16, vy: -Math.random() * 17 - 4,
      s: 5 + Math.random() * 7, r: Math.random() * 6, vr: (Math.random() - .5) * .4, c: cols[Math.random() * 5 | 0]
    }));
    (function f() {
      x.clearRect(0, 0, c.width, c.height);
      let alive = 0;
      for (const p of ps) {
        p.vy += .35; p.x += p.vx; p.y += p.vy; p.vx *= .99; p.r += p.vr;
        if (p.y < c.height + 20) {
          alive = 1;
          x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c;
          x.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .6); x.restore();
        }
      }
      if (alive) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height);
    })();
  };

  G.fly = e => {
    const d = document.createElement('div');
    d.className = 'fl'; d.textContent = e;
    d.style.left = (8 + Math.random() * 84) + 'vw';
    d.style.setProperty('--rot', (Math.random() * 60 - 30) + 'deg');
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 2300);
  };

  // ---------- мем: картинка + текст Impact ----------
  G.fs = t => {
    const l = (t || '').length;
    return '--fs:' + (l <= 10 ? 11 : l <= 20 ? 9 : l <= 32 ? 7 : l <= 50 ? 5.8 : l <= 80 ? 4.6 : 3.8) + 'cqw';
  };
  G.meme = (tpl, top, bot) =>
    `<div class="meme"><img src="${G.img(tpl)}" alt="" onerror="this.onerror=null;this.src='${G.img2(tpl)}'">` +
    `<b class="mt" style="${G.fs(top)}">${G.esc(top)}</b><b class="mb" style="${G.fs(bot)}">${G.esc(bot)}</b></div>`;

  // ---------- холст для рисования ----------
  const COLORS = ['#111111', '#ffffff', '#ff3b3b', '#ff8a3d', '#ffd23f', '#45c96b', '#3ec9e6', '#3b5bff', '#a05bff', '#ff4fa3', '#8a5a3c', '#9aa0a6'];
  G.padHTML = () => `<div class="pad"><canvas width="640" height="480"></canvas>
<div class="tools"><button class="tb on" data-t="pen" aria-label="Pędzel">✏️</button><button class="tb" data-t="er" aria-label="Gumka">🧽</button><button class="tb" data-t="fill" aria-label="Wypełnienie">🪣</button>
${[3, 8, 18].map((s, i) => `<button class="tb ${i === 1 ? 'on' : ''}" data-s="${s}" aria-label="Grubość ${s}"><i style="width:${5 + i * 5}px;height:${5 + i * 5}px"></i></button>`).join('')}
<button class="tb" data-t="undo" aria-label="Cofnij">↩️</button><button class="tb" data-t="clr" aria-label="Wyczyść">🗑️</button></div>
<div class="tools">${COLORS.map((c, i) => `<button class="sw ${i === 0 ? 'on' : ''}" data-c="${c}" style="background:${c}" aria-label="Kolor ${c}"></button>`).join('')}</div></div>`;

  function fill(x, px, py, col) {
    const W = 640, H = 480, im = x.getImageData(0, 0, W, H), d = im.data;
    const i0 = ((py | 0) * W + (px | 0)) * 4, t = [d[i0], d[i0 + 1], d[i0 + 2]];
    const diff = i => Math.abs(d[i] - t[0]) + Math.abs(d[i + 1] - t[1]) + Math.abs(d[i + 2] - t[2]);
    if (Math.abs(t[0] - col[0]) + Math.abs(t[1] - col[1]) + Math.abs(t[2] - col[2]) < 12) return;
    const seen = new Uint8Array(W * H), st = [px | 0, py | 0];
    while (st.length) {
      const y = st.pop(), xx = st.pop();
      if (xx < 0 || y < 0 || xx >= W || y >= H) continue;
      const p = y * W + xx;
      if (seen[p]) continue;
      seen[p] = 1;
      const i = p * 4;
      if (diff(i) > 90) continue;
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      st.push(xx + 1, y, xx - 1, y, xx, y + 1, xx, y - 1);
    }
    x.putImageData(im, 0, 0);
  }

  G.padInit = root => {
    const cv = root.querySelector('canvas'), x = cv.getContext('2d', { willReadFrequently: true });
    x.fillStyle = '#fff'; x.fillRect(0, 0, 640, 480); x.lineCap = x.lineJoin = 'round';
    let tool = 'pen', size = 8, col = '#111111', down = false, lx = 0, ly = 0;
    const hist = [];
    const snap = () => { hist.push(x.getImageData(0, 0, 640, 480)); if (hist.length > 25) hist.shift(); };
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * 640 / r.width, (e.clientY - r.top) * 480 / r.height]; };
    const seg = (a, b, c, d) => {
      x.strokeStyle = tool === 'er' ? '#fff' : col;
      x.lineWidth = tool === 'er' ? size * 2 : size;
      x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke();
    };
    const mark = (sel, b) => { root.querySelectorAll(sel).forEach(n => n.classList.remove('on')); b.classList.add('on'); };
    const setTool = t => { tool = t; root.querySelectorAll('[data-t="pen"],[data-t="er"],[data-t="fill"]').forEach(n => n.classList.toggle('on', n.dataset.t === t)); };

    cv.addEventListener('pointerdown', e => {
      e.preventDefault();
      const [px, py] = pos(e);
      snap();
      if (tool === 'fill') { fill(x, px, py, [1, 3, 5].map(i => parseInt(col.substr(i, 2), 16))); return; }
      down = true; cv.setPointerCapture(e.pointerId); lx = px; ly = py; seg(px, py, px + .01, py);
    });
    cv.addEventListener('pointermove', e => {
      if (!down) return;
      const [px, py] = pos(e);
      seg(lx, ly, px, py); lx = px; ly = py;
    });
    const up = () => { down = false; };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.t === 'undo') { const h = hist.pop(); if (h) x.putImageData(h, 0, 0); }
      else if (d.t === 'clr') { snap(); x.fillStyle = '#fff'; x.fillRect(0, 0, 640, 480); }
      else if (d.t) setTool(d.t);
      else if (d.s) { size = +d.s; mark('[data-s]', b); }
      else if (d.c) { col = d.c; mark('[data-c]', b); if (tool === 'er') setTool('pen'); }
    });
    return { data: () => cv.toDataURL('image/jpeg', .72) };
  };
})();
