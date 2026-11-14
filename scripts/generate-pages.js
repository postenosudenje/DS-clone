// scripts/generate-pages.js
// Generira statičke stranice za suce i klubove + ažurira sitemap.xml
// Pokreće se u GitHub Actions nakon fetch-data.js

const fs = require('fs');
const path = require('path');

// ============================================================
// UČITAVANJE PODATAKA
// ============================================================
const dataPath = path.join(__dirname, '..', 'data', 'utakmice.json');
if (!fs.existsSync(dataPath)) {
  console.error('data/utakmice.json ne postoji. Pokreni fetch-data.js prvo.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const sveUtakmice = [];
if (data.aktivna) {
  data.aktivna.forEach(u => sveUtakmice.push({ ...u, _sezona: 'AKTIVNA' }));
}
if (data['2025-26']) {
  data['2025-26'].forEach(u => sveUtakmice.push({ ...u, _sezona: '2025-26' }));
}

const validne = sveUtakmice.filter(u =>
  u['Domaćin'] && u['Gost'] && u['Glavni sudac'] &&
  String(u['Glavni sudac']).trim() && Number(u.Kolo) >= 1
);

if (validne.length === 0) {
  console.error('Nema validnih utakmica. Prekidam.');
  process.exit(1);
}

console.log(`Ukupno validnih utakmica: ${validne.length}`);

// ============================================================
// POMOĆNE FUNKCIJE
// ============================================================
const num = v => {
  const n = Number(v);
  return isFinite(n) ? n : 0;
};

function slugify(tekst) {
  return tekst.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/č/g, 'c').replace(/ć/g, 'c').replace(/š/g, 's')
    .replace(/ž/g, 'z').replace(/đ/g, 'd')
    .replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ============================================================
// GRBOVI
// ============================================================
const GRBOVI_KLUBOVA = {
  "Dinamo": "https://hnl.hr/static/images/clubs/mq/dinamo.png",
  "GNK Dinamo": "https://hnl.hr/static/images/clubs/mq/dinamo.png",
  "Dinamo Zagreb": "https://hnl.hr/static/images/clubs/mq/dinamo.png",
  "GNK Dinamo Zagreb": "https://hnl.hr/static/images/clubs/mq/dinamo.png",
  "Gorica": "https://hnl.hr/static/images/clubs/mq/gorica.png",
  "HNK Gorica": "https://hnl.hr/static/images/clubs/mq/gorica.png",
  "Hajduk": "https://hnl.hr/static/images/clubs/mq/hajduk.png",
  "Hajduk Split": "https://hnl.hr/static/images/clubs/mq/hajduk.png",
  "HNK Hajduk": "https://hnl.hr/static/images/clubs/mq/hajduk.png",
  "HNK Hajduk Split": "https://hnl.hr/static/images/clubs/mq/hajduk.png",
  "Istra": "https://hnl.hr/static/images/clubs/mq/istra.png",
  "Istra 1961": "https://hnl.hr/static/images/clubs/mq/istra.png",
  "NK Istra": "https://hnl.hr/static/images/clubs/mq/istra.png",
  "NK Istra 1961": "https://hnl.hr/static/images/clubs/mq/istra.png",
  "Lokomotiva": "https://hnl.hr/static/images/clubs/mq/lokomotiva.png",
  "NK Lokomotiva": "https://hnl.hr/static/images/clubs/mq/lokomotiva.png",
  "Lokomotiva Zagreb": "https://hnl.hr/static/images/clubs/mq/lokomotiva.png",
  "NK Lokomotiva Zagreb": "https://hnl.hr/static/images/clubs/mq/lokomotiva.png",
  "Osijek": "https://hnl.hr/static/images/clubs/mq/osijek.png",
  "NK Osijek": "https://hnl.hr/static/images/clubs/mq/osijek.png",
  "Rijeka": "https://hnl.hr/static/images/clubs/mq/rijeka.png",
  "HNK Rijeka": "https://hnl.hr/static/images/clubs/mq/rijeka.png",
  "Rudeš": "https://hnl.hr/static/images/clubs/mq/rudes.png",
  "NK Rudeš": "https://hnl.hr/static/images/clubs/mq/rudes.png",
  "Rudeš Zagreb": "https://hnl.hr/static/images/clubs/mq/rudes.png",
  "Slaven": "https://hnl.hr/static/images/clubs/mq/slaven.png",
  "Slaven Belupo": "https://hnl.hr/static/images/clubs/mq/slaven.png",
  "NK Slaven Belupo": "https://hnl.hr/static/images/clubs/mq/slaven.png",
  "NK Slaven": "https://hnl.hr/static/images/clubs/mq/slaven.png",
  "Varaždin": "https://hnl.hr/static/images/clubs/mq/varazdin.png",
  "Varazdin": "https://hnl.hr/static/images/clubs/mq/varazdin.png",
  "NK Varaždin": "https://hnl.hr/static/images/clubs/mq/varazdin.png",
  "NK Varazdin": "https://hnl.hr/static/images/clubs/mq/varazdin.png",
  "Vukovar": "https://hnl.hr/static/images/clubs/mq/vukovar.png",
  "HNK Vukovar": "https://hnl.hr/static/images/clubs/mq/vukovar.png",
  "Vukovar 1991": "https://hnl.hr/static/images/clubs/mq/vukovar.png",
  "HNK Vukovar 1991": "https://hnl.hr/static/images/clubs/mq/vukovar.png"
};

function getGrbUrl(klub) {
  if (!klub) return null;
  if (GRBOVI_KLUBOVA[klub]) return GRBOVI_KLUBOVA[klub];
  const u = validne.find(x => x['Domaćin'] === klub && x['Grb']);
  if (u && u['Grb']) return u['Grb'];
  const u2 = validne.find(x => x['Gost'] === klub && x['Grb G']);
  if (u2 && u2['Grb G']) return u2['Grb G'];
  return null;
}

// ============================================================
// AGREGATI PO SUCU
// ============================================================
function izracunajStatSudac(ime, utakmice) {
  let zuti = 0, crveni = 0, penal = 0, vp = 0, vpo = 0, br = 0;
  const poKlubu = {};
  const poKolu = {};
  const pozicije = { Glavni: 0, Pomoćni: 0, VAR: 0, AVAR: 0 };

  utakmice.forEach(u => {
    const jeGlavni = u['Glavni sudac'] === ime;
    const jePomocni = u['Pomoćni 1'] === ime || u['Pomoćni 2'] === ime;
    const jeVar = u['VAR'] === ime;
    const jeAvar = u['AVAR'] === ime;
    if (!jeGlavni && !jePomocni && !jeVar && !jeAvar) return;

    br++;
    if (jeGlavni) pozicije.Glavni++;
    if (jePomocni) pozicije.Pomoćni++;
    if (jeVar) pozicije.VAR++;
    if (jeAvar) pozicije.AVAR++;

    const zU = num(u['Žuti D']) + num(u['Žuti G']);
    const cU = num(u['Crveni D']) + num(u['Crveni G']);
    const pU = num(u['Penal D']) + num(u['Penal G']);
    const vpU = num(u['VAR priznat D']) + num(u['VAR priznat G']);
    const vpoU = num(u['VAR poništen D']) + num(u['VAR poništen G']);

    zuti += zU; crveni += cU; penal += pU; vp += vpU; vpo += vpoU;

    const kolo = num(u['Kolo']);
    if (kolo >= 1) {
      if (!poKolu[kolo]) poKolu[kolo] = 0;
      poKolu[kolo] += zU;
    }

    ['Domaćin', 'Gost'].forEach((key, i) => {
      const klub = String(u[key]).trim();
      if (!klub) return;
      const suf = i === 0 ? 'D' : 'G';
      if (!poKlubu[klub]) poKlubu[klub] = { ut: 0, z: 0, c: 0, p: 0, vp: 0, vpo: 0 };
      poKlubu[klub].ut++;
      poKlubu[klub].z += num(u['Žuti ' + suf]);
      poKlubu[klub].c += num(u['Crveni ' + suf]);
      poKlubu[klub].p += num(u['Penal ' + suf]);
      poKlubu[klub].vp += num(u['VAR priznat ' + suf]);
      poKlubu[klub].vpo += num(u['VAR poništen ' + suf]);
    });
  });

  return {
    ime, br, zuti, crveni, penal, vp, vpo,
    ukupno: zuti + crveni + penal + vp + vpo,
    poKlubu, poKolu, pozicije
  };
}

// ============================================================
// AGREGATI PO KLUBU
// ============================================================
function izracunajStatKlub(klub, utakmice) {
  let zuti = 0, crveni = 0, penal = 0, vp = 0, vpo = 0, br = 0;
  const poSudcu = {};

  utakmice.forEach(u => {
    const jd = u['Domaćin'] === klub;
    const jg = u['Gost'] === klub;
    if (!jd && !jg) return;

    br++;
    const suf = jd ? 'D' : 'G';
    const zU = num(u['Žuti ' + suf]);
    const cU = num(u['Crveni ' + suf]);
    const pU = num(u['Penal ' + suf]);
    const vpU = num(u['VAR priznat ' + suf]);
    const vpoU = num(u['VAR poništen ' + suf]);

    zuti += zU; crveni += cU; penal += pU; vp += vpU; vpo += vpoU;

    ['Glavni sudac', 'Pomoćni 1', 'Pomoćni 2', 'VAR', 'AVAR'].forEach(k => {
      const s = u[k];
      if (!s || !String(s).trim()) return;
      const ime = String(s).trim();
      const uloga = (k === 'Pomoćni 1' || k === 'Pomoćni 2') ? 'Pomoćni' : (k === 'Glavni sudac' ? 'Glavni' : k);
      if (!poSudcu[ime]) poSudcu[ime] = { ut: 0, z: 0, c: 0, p: 0, vp: 0, vpo: 0, pozicije: {} };
      poSudcu[ime].ut++;
      poSudcu[ime].z += zU;
      poSudcu[ime].c += cU;
      poSudcu[ime].p += pU;
      poSudcu[ime].vp += vpU;
      poSudcu[ime].vpo += vpoU;
      poSudcu[ime].pozicije[uloga] = (poSudcu[ime].pozicije[uloga] || 0) + 1;
    });
  });

  return {
    ime: klub, br, zuti, crveni, penal, vp, vpo,
    ukupno: zuti + crveni + penal + vp + vpo,
    poSudcu
  };
}

// ============================================================
// TEMPLATE ZA STRANICU SUCA
// ============================================================
function generirajStranicuSuca(sudac, stat) {
  const slug = slugify(sudac);
  const naslov = `${sudac} — statistika suđenja | Pošteno suđenje`;
  const opis = `Statistika suca ${sudac} u HNL-u: ${stat.br} utakmica, ${stat.zuti} žutih, ${stat.crveni} crvenih, ${stat.penal} penala. Detaljna analiza po klubovima.`;

  const kluboviSort = Object.entries(stat.poKlubu)
    .sort((a, b) => (b[1].z + b[1].c + b[1].p) - (a[1].z + a[1].c + a[1].p));

  const n = stat.br || 1;

  return `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<title>${escapeHtml(naslov)}</title>
<meta name="description" content="${escapeHtml(opis)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#0a0a0a">
<link rel="canonical" href="https://postenosudenje.com/sudac/${slug}.html">
<meta property="og:type" content="profile">
<meta property="og:site_name" content="Pošteno suđenje">
<meta property="og:title" content="${escapeHtml(naslov)}">
<meta property="og:description" content="${escapeHtml(opis)}">
<meta property="og:url" content="https://postenosudenje.com/sudac/${slug}.html">
<meta property="og:image" content="https://i.imgur.com/TMWFtd5.png">
<meta property="og:locale" content="hr_HR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(naslov)}">
<meta name="twitter:description" content="${escapeHtml(opis)}">
<meta name="twitter:image" content="https://i.imgur.com/TMWFtd5.png">
<link rel="icon" type="image/png" href="https://i.imgur.com/TMWFtd5.png">
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="stylesheet" href="../styles.css">
<script>
(function() {
  try {
    var theme = localStorage.getItem('posteno_sudenje_theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }
})();
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "${escapeHtml(sudac)}",
  "jobTitle": "Nogometni sudac",
  "url": "https://postenosudenje.com/sudac/${slug}.html",
  "description": "${escapeHtml(opis)}"
}
</script>
</head>
<body>

<a href="#main-content" class="skip-link">Preskoči na glavni sadržaj</a>

<div class="container">

  <header class="header-center" role="banner">
    <a href="/"><img src="https://i.imgur.com/TMWFtd5.png"
         alt="Pošteno suđenje – logo"
         class="site-logo" width="200" height="200"
         loading="eager" decoding="async"></a>
    <nav class="social-icons" aria-label="Društvene mreže">
      <a href="https://www.youtube.com/@postenosudenje" target="_blank" rel="noopener noreferrer"
         class="social-icon youtube-icon" title="YouTube kanal" aria-label="YouTube kanal">
        <i class="fab fa-youtube" aria-hidden="true"></i>
      </a>
      <a href="https://ko-fi.com/anon8" target="_blank" rel="noopener noreferrer"
         class="social-icon coffee-icon" title="Buy Me a Coffee" aria-label="Buy Me a Coffee">
        <i class="fas fa-mug-hot" aria-hidden="true"></i>
      </a>
      <button class="theme-toggle" id="themeToggle" type="button" aria-label="Promijeni temu" title="Promijeni temu">
        <i class="fas fa-moon icon-moon" aria-hidden="true"></i>
        <i class="fas fa-sun icon-sun" aria-hidden="true"></i>
      </button>
    </nav>
  </header>

  <nav class="main-menu" id="mainMenu" role="navigation" aria-label="Glavna navigacija" style="margin-bottom:2rem;">
    <a href="/" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-clipboard-list" aria-hidden="true"></i> Pregled
    </a>
    <a href="/?section=statistika" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-chart-pie" aria-hidden="true"></i> Statistika
    </a>
    <a href="/?section=utakmice" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-futbol" aria-hidden="true"></i> Utakmice
    </a>
    <a href="/?section=usporedba" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-code-compare" aria-hidden="true"></i> Usporedba
    </a>
    <a href="/igra.html" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-gamepad" aria-hidden="true"></i> Igra
    </a>
  </nav>

  <main id="main-content" role="main">
    <section class="section-panel active">
      <h1 class="section-title" style="margin-top:0; font-size:2rem;">
        <i class="fas fa-user-tie" aria-hidden="true"></i> ${escapeHtml(sudac)}
      </h1>
      <p class="table-info">
        <i class="fas fa-info-circle" aria-hidden="true"></i>
        <span>Sudac u HNL-u · ${stat.br} utakmica ukupno (sve sezone)</span>
      </p>

      <div class="stats-grid">
        <div class="stat-item"><div class="label"><span class="karton-ikona zuti"></span> Žuti</div><div class="value yellow">${stat.zuti}</div><div class="per-match">${(stat.zuti/n).toFixed(2)} po utakmici</div></div>
        <div class="stat-item"><div class="label"><span class="karton-ikona crveni"></span> Crveni</div><div class="value red">${stat.crveni}</div><div class="per-match">${(stat.crveni/n).toFixed(2)} po utakmici</div></div>
        <div class="stat-item"><div class="label"><i class="fas fa-futbol" style="color:var(--blue);"></i> Penal</div><div class="value penalty">${stat.penal}</div><div class="per-match">${(stat.penal/n).toFixed(2)} po utakmici</div></div>
        <div class="stat-item"><div class="label"><i class="fas fa-video" style="color:var(--green);"></i> VAR+</div><div class="value var">${stat.vp}</div></div>
        <div class="stat-item"><div class="label"><i class="fas fa-video-slash" style="color:var(--text-muted);"></i> VAR−</div><div class="value var">${stat.vpo}</div></div>
      </div>

      <h2 class="section-title"><i class="fas fa-user-tag" aria-hidden="true"></i> Pozicije u sudačkoj ekipi</h2>
      <div class="stats-grid">
        <div class="stat-item"><div class="label"><i class="fas fa-user-tie" style="color:var(--yellow);"></i> Glavni</div><div class="value yellow">${stat.pozicije.Glavni}</div></div>
        <div class="stat-item"><div class="label"><i class="fas fa-flag" style="color:var(--blue);"></i> Pomoćni</div><div class="value penalty">${stat.pozicije.Pomoćni}</div></div>
        <div class="stat-item"><div class="label"><i class="fas fa-video" style="color:var(--green);"></i> VAR</div><div class="value var">${stat.pozicije.VAR}</div></div>
        <div class="stat-item"><div class="label"><i class="fas fa-headset" style="color:var(--text-muted);"></i> AVAR</div><div class="value" style="color:var(--text-muted);">${stat.pozicije.AVAR}</div></div>
      </div>

      <h2 class="section-title"><i class="fas fa-shield-alt" aria-hidden="true"></i> Klubovi (${kluboviSort.length})</h2>
      <div class="table-wrapper">
        <table aria-label="Tablica po klubovima">
          <thead><tr>
            <th>Klub</th>
            <th>Utakmice</th>
            <th><span class="karton-ikona zuti"></span> Žuti</th>
            <th><span class="karton-ikona crveni"></span> Crveni</th>
            <th><i class="fas fa-futbol th-icon blue"></i> Penal</th>
            <th><i class="fas fa-video th-icon green"></i> VAR+</th>
            <th><i class="fas fa-video-slash th-icon muted"></i> VAR−</th>
          </tr></thead>
          <tbody>
            ${kluboviSort.map(([klub, d]) => {
              const grb = getGrbUrl(klub);
              const grbHtml = grb
                ? `<img src="${grb}" alt="Grb ${escapeHtml(klub)}" class="klub-grb" loading="lazy">`
                : `<span class="klub-grb fallback"><i class="fas fa-shield-alt"></i></span>`;
              return `<tr>
                <td><a href="../klub/${slugify(klub)}.html" class="klub-badge" style="text-decoration:none;">${grbHtml} ${escapeHtml(klub)}</a></td>
                <td>${d.ut}</td>
                <td style="color:var(--yellow);font-weight:700;">${d.z}</td>
                <td style="color:var(--red-soft);font-weight:700;">${d.c}</td>
                <td style="color:var(--blue);font-weight:600;">${d.p}</td>
                <td style="color:var(--green);font-weight:600;">${d.vp}</td>
                <td style="color:var(--text-muted);font-weight:600;">${d.vpo}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <p style="text-align:center; margin-top:2rem;">
        <a href="/" class="igra-btn igra-btn-primary" style="text-decoration:none;">
          <i class="fas fa-arrow-left" aria-hidden="true"></i> Natrag na glavnu stranicu
        </a>
      </p>
    </section>
  </main>

  <footer class="seo-footer-text" role="contentinfo">
    <h2>O platformi Pošteno suđenje</h2>
    <p>
      <strong>Pošteno suđenje</strong> okuplja i analizira podatke o sudačkim odlukama u
      <strong>SuperSport HNL-u</strong> – hrvatskoj nogometnoj ligi.
    </p>
    <div class="footer-support">
      <a href="https://ko-fi.com/anon8" target="_blank" rel="noopener noreferrer" class="bmc-button">
        <i class="fas fa-mug-hot" aria-hidden="true"></i> Buy Me a Coffee
      </a>
      <a href="https://www.youtube.com/@postenosudenje" target="_blank" rel="noopener noreferrer" class="yt-button">
        <i class="fab fa-youtube" aria-hidden="true"></i> YouTube kanal
      </a>
    </div>
  </footer>

</div>

<script>
document.getElementById('themeToggle').addEventListener('click', function() {
  var t = document.documentElement.getAttribute('data-theme') || 'dark';
  var nova = t === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nova);
  localStorage.setItem('posteno_sudenje_theme', nova);
});
</script>

</body>
</html>`;
}

// ============================================================
// TEMPLATE ZA STRANICU KLUBA
// ============================================================
function generirajStranicuKluba(klub, stat) {
  const slug = slugify(klub);
  const naslov = `${klub} — statistika suđenja | Pošteno suđenje`;
  const opis = `Statistika kluba ${klub} u HNL-u: ${stat.br} utakmica, ${stat.zuti} žutih, ${stat.crveni} crvenih, ${stat.penal} penala. Analiza po sucima.`;

  const suciSort = Object.entries(stat.poSudcu)
    .map(([ime, d]) => ({ ime, ...d, ukupno: d.z + d.c + d.p + d.vp + d.vpo }))
    .sort((a, b) => b.ukupno - a.ukupno || a.ime.localeCompare(b.ime, 'hr'));

  const n = stat.br || 1;
  const grbUrl = getGrbUrl(klub);
  const grbImg = grbUrl
    ? `<img src="${grbUrl}" alt="Grb ${escapeHtml(klub)}" style="width:80px;height:80px;object-fit:contain;">`
    : `<i class="fas fa-shield-alt" style="font-size:3rem;color:var(--yellow);"></i>`;

  return `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
<title>${escapeHtml(naslov)}</title>
<meta name="description" content="${escapeHtml(opis)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#0a0a0a">
<link rel="canonical" href="https://postenosudenje.com/klub/${slug}.html">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Pošteno suđenje">
<meta property="og:title" content="${escapeHtml(naslov)}">
<meta property="og:description" content="${escapeHtml(opis)}">
<meta property="og:url" content="https://postenosudenje.com/klub/${slug}.html">
<meta property="og:image" content="https://i.imgur.com/TMWFtd5.png">
<meta property="og:locale" content="hr_HR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(naslov)}">
<meta name="twitter:description" content="${escapeHtml(opis)}">
<meta name="twitter:image" content="https://i.imgur.com/TMWFtd5.png">
<link rel="icon" type="image/png" href="https://i.imgur.com/TMWFtd5.png">
<link rel="preconnect" href="https://fonts.googleapis.com" crossorigin>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Figtree:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
<link rel="stylesheet" href="../styles.css">
<script>
(function() {
  try {
    var theme = localStorage.getItem('posteno_sudenje_theme');
    if (theme !== 'light' && theme !== 'dark') {
      theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { document.documentElement.setAttribute('data-theme', 'dark'); }
})();
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SportsTeam",
  "name": "${escapeHtml(klub)}",
  "sport": "Nogomet",
  "url": "https://postenosudenje.com/klub/${slug}.html",
  "description": "${escapeHtml(opis)}"
}
</script>
</head>
<body>

<a href="#main-content" class="skip-link">Preskoči na glavni sadržaj</a>

<div class="container">

  <header class="header-center" role="banner">
    <a href="/"><img src="https://i.imgur.com/TMWFtd5.png"
         alt="Pošteno suđenje – logo"
         class="site-logo" width="200" height="200"
         loading="eager" decoding="async"></a>
    <nav class="social-icons" aria-label="Društvene mreže">
      <a href="https://www.youtube.com/@postenosudenje" target="_blank" rel="noopener noreferrer"
         class="social-icon youtube-icon" title="YouTube kanal" aria-label="YouTube kanal">
        <i class="fab fa-youtube" aria-hidden="true"></i>
      </a>
      <a href="https://ko-fi.com/anon8" target="_blank" rel="noopener noreferrer"
         class="social-icon coffee-icon" title="Buy Me a Coffee" aria-label="Buy Me a Coffee">
        <i class="fas fa-mug-hot" aria-hidden="true"></i>
      </a>
      <button class="theme-toggle" id="themeToggle" type="button" aria-label="Promijeni temu" title="Promijeni temu">
        <i class="fas fa-moon icon-moon" aria-hidden="true"></i>
        <i class="fas fa-sun icon-sun" aria-hidden="true"></i>
      </button>
    </nav>
  </header>

  <nav class="main-menu" id="mainMenu" role="navigation" aria-label="Glavna navigacija" style="margin-bottom:2rem;">
    <a href="/" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-clipboard-list" aria-hidden="true"></i> Pregled
    </a>
    <a href="/?section=statistika" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-chart-pie" aria-hidden="true"></i> Statistika
    </a>
    <a href="/?section=utakmice" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-futbol" aria-hidden="true"></i> Utakmice
    </a>
    <a href="/?section=usporedba" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-code-compare" aria-hidden="true"></i> Usporedba
    </a>
    <a href="/igra.html" class="menu-item" style="text-decoration:none;">
      <i class="fas fa-gamepad" aria-hidden="true"></i> Igra
    </a>
  </nav>

  <main id="main-content" role="main">
    <section class="section-panel active">
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:1.5rem; flex-wrap:wrap;">
        ${grbImg}
        <h1 class="section-title" style="margin:0; font-size:2rem;">
          ${escapeHtml(klub)}
        </h1>
      </div>
      <p class="table-info">
        <i class="fas fa-info-circle" aria-hidden="true"></i>
        <span>Klub u HNL-u · ${stat.br} utakmica ukupno (sve sezone)</span>
      </p>

      <div class="stats-grid">
        <div class="stat-item"><div class="label"><span class="karton-ikona zuti"></span> Žuti</div><div class="value yellow">${stat.zuti}</div><div class="per-match">${(stat.zuti/n).toFixed(2)} po utakmici</div></div>
        <div class="stat-item"><div class="label"><span class="karton-ikona crveni"></span> Crveni</div><div class="value red">${stat.crveni}</div><div class="per-match">${(stat.crveni/n).toFixed(2)} po utakmici</div></div>
        <div class="stat-item"><div class="label"><i class="fas fa-futbol" style="color:var(--blue);"></i> Penal</div><div class="value penalty">${stat.penal}</div><div class="per-match">${(stat.penal/n).toFixed(2)} po utakmici</div></div>
        <div class="stat-item"><div class="label"><i class="fas fa-video" style="color:var(--green);"></i> VAR+</div><div class="value var">${stat.vp}</div></div>
        <div class="stat-item"><div class="label"><i class="fas fa-video-slash" style="color:var(--text-muted);"></i> VAR−</div><div class="value var">${stat.vpo}</div></div>
      </div>

      <h2 class="section-title"><i class="fas fa-user-tie" aria-hidden="true"></i> Suci (${suciSort.length})</h2>
      <div class="table-wrapper">
        <table aria-label="Tablica po sucima">
          <thead><tr>
            <th>Sudac</th>
            <th>Utakmice</th>
            <th><span class="karton-ikona zuti"></span> Žuti</th>
            <th><span class="karton-ikona crveni"></span> Crveni</th>
            <th><i class="fas fa-futbol th-icon blue"></i> Penal</th>
            <th><i class="fas fa-video th-icon green"></i> VAR+</th>
            <th><i class="fas fa-video-slash th-icon muted"></i> VAR−</th>
          </tr></thead>
          <tbody>
            ${suciSort.map(s => {
              const pozStr = Object.entries(s.pozicije).map(([p, cnt]) => cnt > 1 ? `${p} ×${cnt}` : p).join(', ');
              return `<tr>
                <td><a href="../sudac/${slugify(s.ime)}.html" class="klub-badge" style="text-decoration:none;"><i class="fas fa-user-tie" style="color:var(--yellow);"></i> ${escapeHtml(s.ime)} <span style="font-size:0.7rem;color:var(--text-dim);">${pozStr}</span></a></td>
                <td>${s.ut}</td>
                <td style="color:var(--yellow);font-weight:700;">${s.z}</td>
                <td style="color:var(--red-soft);font-weight:700;">${s.c}</td>
                <td style="color:var(--blue);font-weight:600;">${s.p}</td>
                <td style="color:var(--green);font-weight:600;">${s.vp}</td>
                <td style="color:var(--text-muted);font-weight:600;">${s.vpo}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <p style="text-align:center; margin-top:2rem;">
        <a href="/" class="igra-btn igra-btn-primary" style="text-decoration:none;">
          <i class="fas fa-arrow-left" aria-hidden="true"></i> Natrag na glavnu stranicu
        </a>
      </p>
    </section>
  </main>

  <footer class="seo-footer-text" role="contentinfo">
    <h2>O platformi Pošteno suđenje</h2>
    <p>
      <strong>Pošteno suđenje</strong> okuplja i analizira podatke o sudačkim odlukama u
      <strong>SuperSport HNL-u</strong> – hrvatskoj nogometnoj ligi.
    </p>
    <div class="footer-support">
      <a href="https://ko-fi.com/anon8" target="_blank" rel="noopener noreferrer" class="bmc-button">
        <i class="fas fa-mug-hot" aria-hidden="true"></i> Buy Me a Coffee
      </a>
      <a href="https://www.youtube.com/@postenosudenje" target="_blank" rel="noopener noreferrer" class="yt-button">
        <i class="fab fa-youtube" aria-hidden="true"></i> YouTube kanal
      </a>
    </div>
  </footer>

</div>

<script>
document.getElementById('themeToggle').addEventListener('click', function() {
  var t = document.documentElement.getAttribute('data-theme') || 'dark';
  var nova = t === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', nova);
  localStorage.setItem('posteno_sudenje_theme', nova);
});
</script>

</body>
</html>`;
}

// ============================================================
// GLAVNA LOGIKA
// ============================================================
const rootDir = path.join(__dirname, '..');
const sudacDir = path.join(rootDir, 'sudac');
const klubDir = path.join(rootDir, 'klub');

fs.mkdirSync(sudacDir, { recursive: true });
fs.mkdirSync(klubDir, { recursive: true });

const sviSuciSet = new Set();
const sviKluboviSet = new Set();

validne.forEach(u => {
  ['Glavni sudac', 'Pomoćni 1', 'Pomoćni 2', 'VAR', 'AVAR'].forEach(k => {
    if (u[k] && String(u[k]).trim()) sviSuciSet.add(String(u[k]).trim());
  });
  ['Domaćin', 'Gost'].forEach(k => {
    if (u[k] && String(u[k]).trim()) sviKluboviSet.add(String(u[k]).trim());
  });
});

const sviSuci = [...sviSuciSet].sort((a, b) => a.localeCompare(b, 'hr'));
const sviKlubovi = [...sviKluboviSet].sort((a, b) => a.localeCompare(b, 'hr'));

console.log(`Sudaca: ${sviSuci.length}, klubova: ${sviKlubovi.length}`);

let brojSudaca = 0;
sviSuci.forEach(sudac => {
  const stat = izracunajStatSudac(sudac, validne);
  if (stat.br === 0) return;
  const html = generirajStranicuSuca(sudac, stat);
  const slug = slugify(sudac);
  fs.writeFileSync(path.join(sudacDir, `${slug}.html`), html);
  brojSudaca++;
  console.log(`  ✓ sudac/${slug}.html`);
});

let brojKlubova = 0;
sviKlubovi.forEach(klub => {
  const stat = izracunajStatKlub(klub, validne);
  if (stat.br === 0) return;
  const html = generirajStranicuKluba(klub, stat);
  const slug = slugify(klub);
  fs.writeFileSync(path.join(klubDir, `${slug}.html`), html);
  brojKlubova++;
  console.log(`  ✓ klub/${slug}.html`);
});

// ============================================================
// GENERIRANJE SITEMAPA
// ============================================================
const danas = new Date().toISOString().slice(0, 10);
const baseUrl = 'https://postenosudenje.com';

let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">

  <!-- Glavna stranica -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${danas}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
    <xhtml:link rel="alternate" hreflang="hr" href="${baseUrl}/"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/"/>
  </url>

  <!-- Igra / kviz -->
  <url>
    <loc>${baseUrl}/igra.html</loc>
    <lastmod>${danas}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <xhtml:link rel="alternate" hreflang="hr" href="${baseUrl}/igra.html"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/igra.html"/>
  </url>

  <!-- Sekcije glavne stranice -->
  <url>
    <loc>${baseUrl}/?section=statistika</loc>
    <lastmod>${danas}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/?section=utakmice</loc>
    <lastmod>${danas}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/?section=usporedba</loc>
    <lastmod>${danas}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/?section=pregled</loc>
    <lastmod>${danas}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Suci -->
`;

sviSuci.forEach(sudac => {
  const stat = izracunajStatSudac(sudac, validne);
  if (stat.br === 0) return;
  const slug = slugify(sudac);
  sitemap += `  <url>
    <loc>${baseUrl}/sudac/${slug}.html</loc>
    <lastmod>${danas}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
});

sitemap += `
  <!-- Klubovi -->
`;

sviKlubovi.forEach(klub => {
  const stat = izracunajStatKlub(klub, validne);
  if (stat.br === 0) return;
  const slug = slugify(klub);
  sitemap += `  <url>
    <loc>${baseUrl}/klub/${slug}.html</loc>
    <lastmod>${danas}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
`;
});

sitemap += `
</urlset>
`;

fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemap);

console.log('');
console.log('=== SAŽETAK ===');
console.log(`Generirano sudačkih stranica: ${brojSudaca}`);
console.log(`Generirano klupskih stranica: ${brojKlubova}`);
console.log(`Sitemap ažuriran: sitemap.xml (${brojSudaca + brojKlubova + 7} URL-ova)`);
