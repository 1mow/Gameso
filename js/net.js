// Sieć: host to przeglądarka twórcy pokoju (peer id = "gameso-KOD"), reszta łączy się do niego.
(() => {
  const N = G.net = { p: null, c: null };

  N.host = (code, cb) => {
    let ok = 0, lock = null;
    const p = N.p = new Peer('gameso-' + code);
    const wake = async () => { try { if (navigator.wakeLock && !document.hidden) lock = await navigator.wakeLock.request('screen'); } catch (e) {} };
    // po powrocie na kartę (np. z WhatsAppa) odnawiamy rejestrację pokoju w brokerze
    const back = () => {
      if (document.hidden) return;
      wake();
      if (!p.destroyed && p.disconnected) { try { p.reconnect(); } catch (e) {} }
    };
    document.addEventListener('visibilitychange', back);
    addEventListener('online', back);
    p.on('open', () => { ok = 1; wake(); cb(); });
    p.on('error', e => { if (!ok) cb(e); else console.warn(e); });
    p.on('disconnected', () => { try { p.reconnect(); } catch (e) {} });
    p.on('connection', c => {
      c.on('data', m => G.Host.onConn(c, m));
      c.on('close', () => G.Host.onClose(c));
      c.on('error', () => {});
    });
  };

  // h: { open, data, lost, wait, fail }
  N.join = (code, h) => {
    let tries = 0, opened = false, dead = false, att = 0;
    const p = N.p = new Peer();
    const go = () => {
      const id = ++att, c = N.c = p.connect('gameso-' + code, { reliable: true });
      const to = setTimeout(() => { if (!c.open) { try { c.close(); } catch (e) {} retry(id); } }, 9000);
      c.on('open', () => { clearTimeout(to); opened = true; tries = 0; h.open(); });
      c.on('data', h.data);
      c.on('close', () => { clearTimeout(to); if (N.c === c) retry(id); });
      c.on('error', () => {});
    };
    // id — numer próby; spóźnione zdarzenia starej próby ignorujemy
    const retry = id => {
      if (dead || id !== att) return;
      if (tries++ >= (opened ? 10 : 12)) { dead = true; return h.fail(opened ? 'host' : 'nf'); }
      if (opened) h.lost(); else if (tries > 1) h.wait();
      setTimeout(go, opened ? 2000 : 2500);
    };
    p.on('open', go);
    p.on('error', e => {
      if (opened || dead) return;
      if (e.type === 'peer-unavailable') return retry(att);   // host mógł chwilowo zniknąć, próbujemy dalej
      dead = true; h.fail('net');
    });
    p.on('disconnected', () => { try { p.reconnect(); } catch (e) {} });
  };

  N.send = m => { if (N.c && N.c.open) N.c.send(m); };
  N.close = () => { try { N.p && N.p.destroy(); } catch (e) {} N.p = N.c = null; };
})();
