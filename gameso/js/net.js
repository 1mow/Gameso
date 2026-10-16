// Сеть: хост — это браузер создателя комнаты (peer id = "gameso-КОД"), остальные подключаются к нему.
(() => {
  const N = G.net = { p: null, c: null };

  N.host = (code, cb) => {
    let ok = 0;
    const p = N.p = new Peer('gameso-' + code);
    p.on('open', () => { ok = 1; cb(); });
    p.on('error', e => { if (!ok) cb(e); else console.warn(e); });
    p.on('disconnected', () => { try { p.reconnect(); } catch (e) {} });
    p.on('connection', c => {
      c.on('data', m => G.Host.onConn(c, m));
      c.on('close', () => G.Host.onClose(c));
      c.on('error', () => {});
    });
  };

  // h: { open, data, lost, fail }
  N.join = (code, h) => {
    let tries = 0, opened = false, dead = false;
    const p = N.p = new Peer();
    const go = () => {
      const c = N.c = p.connect('gameso-' + code, { reliable: true });
      const to = setTimeout(() => { if (!c.open) { try { c.close(); } catch (e) {} retry(); } }, 9000);
      c.on('open', () => { clearTimeout(to); opened = true; tries = 0; h.open(); });
      c.on('data', h.data);
      c.on('close', () => { clearTimeout(to); if (N.c === c) retry(); });
      c.on('error', () => {});
    };
    const retry = () => {
      if (dead) return;
      if (tries++ >= (opened ? 10 : 2)) { dead = true; return h.fail(opened ? 'host' : 'nf'); }
      if (opened) h.lost();
      setTimeout(go, opened ? 2000 : 500);
    };
    p.on('open', go);
    p.on('error', e => {
      if (opened) return;
      dead = true;
      h.fail(e.type === 'peer-unavailable' ? 'nf' : 'net');
    });
    p.on('disconnected', () => { try { p.reconnect(); } catch (e) {} });
  };

  N.send = m => { if (N.c && N.c.open) N.c.send(m); };
  N.close = () => { try { N.p && N.p.destroy(); } catch (e) {} N.p = N.c = null; };
})();
