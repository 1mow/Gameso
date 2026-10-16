window.G = {
  // шаблоны Memegen (id из api.memegen.link/templates)
  T: ['drake', 'db', 'buzz', 'doge', 'fry', 'success', 'fine', 'mordor', 'rollsafe', 'spongebob', 'ds', 'cmm', 'gru', 'pigeon', 'woman-cat', 'blb', 'philosoraptor', 'stonks', 'wonka'],
  img: (id, w) => `https://api.memegen.link/images/${id}/_.png?width=${w || 640}`,
  img2: id => `https://api.memegen.link/images/${id}.png`,
  P: ['Kot, który boi się ogórków', 'Babcia na deskorolce', 'Pingwin zdaje egzamin na prawo jazdy', 'Kosmonauta zapomniał wyłączyć żelazko', 'Dinozaur w kolejce do przychodni',
    'Robot uczy się gotować barszcz', 'Święty Mikołaj spóźnia się na samolot', 'Żaba-dyrektor na zebraniu', 'Rekin idzie na randkę', 'Zombie szuka Wi-Fi',
    'Jednorożec naprawia pralkę', 'Ślimak wygrywa maraton', 'Smok na rozmowie o pracę', 'Krokodyl myje zęby', 'Niedźwiedź sprzedaje kebaby',
    'Wilk i siedem koźlątek w coworkingu', 'Kaczka-programista', 'Słoń chowa się w szafie', 'Pirat zamawia pizzę', 'Hipopotam na trampolinie',
    'Ninja utknął w windzie', 'Pies taksówkarz wiezie kota', 'Ośmiornica pisze na klawiaturze', 'Chomik buduje rakietę', 'Mumia pracuje zdalnie',
    'Kura przechodzi przez jezdnię w Warszawie', 'Wampir boi się dentysty', 'Żyrafa kupuje szalik', 'Król w kolejce po zapiekankę', 'Kosmita sprawdza pocztę'],
  E: ['🦊', '🐙', '🐸', '🦄', '🐼', '🐯', '🦖', '🐧', '🦉', '🐲', '🐵', '🦁', '🐰', '🐨', '🦋', '🐝', '🐳', '🦔'],
  C: ['#ff4fa3', '#ffd23f', '#45e8b5', '#6ea8ff', '#ff8a3d', '#b78bff', '#ff5e5e', '#5ee0ff', '#c6f24e', '#ff9ad5', '#8fa4ff', '#ffc27a'],
  L: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  DEF: { game: 'gartic', write: 45, draw: 90, hide: 5, random: false, rounds: 4, mtime: 45 },
  GAMES: [
    { id: 'phone', n: 'Głuchy telefon', e: '📞', c: '#ffd23f', d: 'Hasło krąży po kółku, a każdy opowiada je po swojemu. Na końcu zobaczymy, w co się zamieniło.' },
    { id: 'gartic', n: 'Gartic Phone', e: '🎨', c: '#ff4fa3', d: 'Hasło, rysunek, opis, znowu rysunek. Im dalej w łańcuszek, tym szaleniej.' },
    { id: 'memer', n: 'Memer', e: '😹', c: '#45e8b5', d: 'Jeden obrazek dla wszystkich. Podpisz go, a potem wspólnie wybierzemy najlepszego mema.' }
  ]
};
if (typeof module !== 'undefined') module.exports = G;
