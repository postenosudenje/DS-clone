function igraGenerirajPitanja() {
  const sveUtakmice = [];
  if (SVI_PODACI) {
    if (SVI_PODACI.aktivna) SVI_PODACI.aktivna.forEach(u => sveUtakmice.push({ ...u, _sezona: 'AKTIVNA' }));
    if (SVI_PODACI['2025-26']) SVI_PODACI['2025-26'].forEach(u => sveUtakmice.push({ ...u, _sezona: '2025-26' }));
  }
  const validne = sveUtakmice.filter(u =>
    u['Glavni sudac'] && String(u['Glavni sudac']).trim() &&
    u['Domaćin'] && u['Gost'] && num(u.Kolo) >= 1
  );
  if (validne.length < 10) return [];

  const sviSuci = [...new Set(validne.map(u => String(u['Glavni sudac']).trim()))];
  const sviKlubovi = [...new Set([
    ...validne.map(u => String(u['Domaćin']).trim()),
    ...validne.map(u => String(u['Gost']).trim())
  ])];
  if (sviSuci.length < 4 || sviKlubovi.length < 4) return [];

  const sveSezone = ['AKTIVNA', '2025-26'];

  // Agregati po sucu
  const poSudcu = {};
  sviSuci.forEach(s => {
    poSudcu[s] = { zuti: 0, crveni: 0, penal: 0, vp: 0, vpo: 0, utakmica: 0 };
  });
  validne.forEach(u => {
    const s = String(u['Glavni sudac']).trim();
    poSudcu[s].utakmica++;
    poSudcu[s].zuti += num(u['Žuti D']) + num(u['Žuti G']);
    poSudcu[s].crveni += num(u['Crveni D']) + num(u['Crveni G']);
    poSudcu[s].penal += num(u['Penal D']) + num(u['Penal G']);
    poSudcu[s].vp += num(u['VAR priznat D']) + num(u['VAR priznat G']);
    poSudcu[s].vpo += num(u['VAR poništen D']) + num(u['VAR poništen G']);
  });

  // Agregati po klubu
  const poKlubu = {};
  sviKlubovi.forEach(k => {
    poKlubu[k] = { zuti: 0, crveni: 0, penal: 0 };
  });
  validne.forEach(u => {
    ['Domaćin', 'Gost'].forEach(key => {
      const klub = String(u[key]).trim();
      const suf = key === 'Domaćin' ? 'D' : 'G';
      if (!poKlubu[klub]) return;
      poKlubu[klub].zuti += num(u['Žuti ' + suf]);
      poKlubu[klub].crveni += num(u['Crveni ' + suf]);
      poKlubu[klub].penal += num(u['Penal ' + suf]);
    });
  });

  const svaPitanja = [];

  // ---------------------------------------------------------
  // TIP 1: Koji sudac je sudio utakmicu?
  // ---------------------------------------------------------
  igraNasumicnoOdaberi(validne, 6).forEach(u => {
    const tocan = String(u['Glavni sudac']).trim();
    const ostali = sviSuci.filter(s => s !== tocan);
    const lazni = igraNasumicnoOdaberi(ostali, 3);
    const odgovori = igraNasumicnoOdaberi([tocan, ...lazni], 4);
    svaPitanja.push({
      tip: 'sudac',
      pitanje: 'Koji sudac je sudio ovu utakmicu?',
      kontekst: `<strong>${u['Domaćin']}</strong> <span class="vs-badge">vs</span> <strong>${u['Gost']}</strong> · ${u.Kolo}. kolo`,
      odgovori,
      tocan
    });
  });

  // ---------------------------------------------------------
  // TIP 2: Koliko je sudac dosudio X?
  // ---------------------------------------------------------
  const tipoviBrojeva = ['zuti', 'crveni', 'penal'];
  igraNasumicnoOdaberi(sviSuci, 6).forEach((sudac, idx) => {
    const tip = tipoviBrojeva[idx % tipoviBrojeva.length];
    const ukupno = poSudcu[sudac][tip];
    const nazivTipa = tip === 'zuti' ? 'žutih kartona' : tip === 'crveni' ? 'crvenih kartona' : 'penala';
    const nazivIkone = tip === 'zuti' ? '🟨' : tip === 'crveni' ? '🟥' : '⚽';
    const odgovori = igraGenerirajBrojOpcije(ukupno);
    svaPitanja.push({
      tip: 'broj',
      pitanje: `Koliko je ${nazivTipa} ${nazivIkone} dosudio sudac u svim utakmicama?`,
      kontekst: `<strong>${sudac}</strong>`,
      odgovori: odgovori.map(String),
      tocan: String(ukupno)
    });
  });

  // ---------------------------------------------------------
  // TIP 3: Koji klub ima najviše X?
  // ---------------------------------------------------------
  ['zuti', 'crveni', 'penal'].forEach(tip => {
    const nazivTipa = tip === 'zuti' ? 'žutih kartona' : tip === 'crveni' ? 'crvenih kartona' : 'penala';
    const nazivIkone = tip === 'zuti' ? '🟨' : tip === 'crveni' ? '🟥' : '⚽';
    const sortirano = Object.entries(poKlubu).sort((a, b) => b[1][tip] - a[1][tip]);
    const tocan = sortirano[0][0];
    const ostali = sviKlubovi.filter(k => k !== tocan);
    const lazni = igraNasumicnoOdaberi(ostali, 3);
    const odgovori = igraNasumicnoOdaberi([tocan, ...lazni], 4);
    svaPitanja.push({
      tip: 'klub',
      pitanje: `Koji klub je dobio najviše ${nazivTipa} ${nazivIkone}?`,
      kontekst: `<strong>Sve sezone ukupno</strong>`,
      odgovori,
      tocan
    });
  });

  // ---------------------------------------------------------
  // TIP 4: Koliko je utakmica sudio sudac?
  // ---------------------------------------------------------
  igraNasumicnoOdaberi(sviSuci, 4).forEach(sudac => {
    const ukupno = poSudcu[sudac].utakmica;
    const odgovori = igraGenerirajBrojOpcije(ukupno);
    svaPitanja.push({
      tip: 'broj',
      pitanje: 'Koliko je utakmica sudio ovaj sudac?',
      kontekst: `<strong>${sudac}</strong>`,
      odgovori: odgovori.map(String),
      tocan: String(ukupno)
    });
  });

  // ---------------------------------------------------------
  // TIP 5: U kojoj sezoni je sudac sudio VIŠE utakmica?
  // ---------------------------------------------------------
  const suciObeSezone = sviSuci.filter(s => {
    const uAkt = validne.filter(u => u._sezona === 'AKTIVNA' && String(u['Glavni sudac']).trim() === s).length;
    const uPro = validne.filter(u => u._sezona === '2025-26' && String(u['Glavni sudac']).trim() === s).length;
    return uAkt > 0 && uPro > 0;
  });
  igraNasumicnoOdaberi(suciObeSezone, 3).forEach(sudac => {
    const uAkt = validne.filter(u => u._sezona === 'AKTIVNA' && String(u['Glavni sudac']).trim() === sudac).length;
    const uPro = validne.filter(u => u._sezona === '2025-26' && String(u['Glavni sudac']).trim() === sudac).length;
    if (uAkt === uPro) return;
    const tocan = uAkt > uPro ? '2026/27' : '2025/26';
    const odgovori = ['2026/27', '2025/26', 'Jednako', 'Sudac nije sudio u obje'];
    svaPitanja.push({
      tip: 'sezona',
      pitanje: 'U kojoj sezoni je sudac sudio VIŠE utakmica?',
      kontekst: `<strong>${sudac}</strong>`,
      odgovori: igraNasumicnoOdaberi(odgovori, 4),
      tocan
    });
  });

  // ---------------------------------------------------------
  // TIP 6: Koji sudac je dosudio NAJVIŠE penala?
  // ---------------------------------------------------------
  const sortPenali = Object.entries(poSudcu).sort((a, b) => b[1].penal - a[1].penal);
  const tocanPenali = sortPenali[0][0];
  const ostaliPenali = sviSuci.filter(s => s !== tocanPenali);
  const lazniPenali = igraNasumicnoOdaberi(ostaliPenali, 3);
  svaPitanja.push({
    tip: 'sudac',
    pitanje: 'Koji sudac je dosudio NAJVIŠE penala?',
    kontekst: '<strong>Sve sezone ukupno</strong>',
    odgovori: igraNasumicnoOdaberi([tocanPenali, ...lazniPenali], 4),
    tocan: tocanPenali
  });

  // ---------------------------------------------------------
  // TIP 7: Koliko je klub dobio crvenih kartona?
  // ---------------------------------------------------------
  igraNasumicnoOdaberi(sviKlubovi, 4).forEach(klub => {
    const ukupno = poKlubu[klub].crveni;
    const odgovori = igraGenerirajBrojOpcije(ukupno);
    svaPitanja.push({
      tip: 'klub',
      pitanje: 'Koliko crvenih kartona 🟥 je dobio ovaj klub?',
      kontekst: `<strong>${klub}</strong>`,
      odgovori: odgovori.map(String),
      tocan: String(ukupno)
    });
  });

  // Izmiješaj sva pitanja
  for (let i = svaPitanja.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [svaPitanja[i], svaPitanja[j]] = [svaPitanja[j], svaPitanja[i]];
  }

  return svaPitanja.slice(0, IGRA_BROJ_PITANJA);
}

// Pomoćna funkcija: generiraj 4 broja oko točnog
function igraGenerirajBrojOpcije(tocan) {
  const opcije = new Set([tocan]);
  let pokusaj = 0;
  while (opcije.size < 4 && pokusaj < 50) {
    pokusaj++;
    const offset = Math.floor(Math.random() * 9) - 4; // -4 do +4
    const kandidat = tocan + offset;
    if (kandidat >= 0 && kandidat !== tocan) opcije.add(kandidat);
  }
  let dodatak = 1;
  while (opcije.size < 4) {
    opcije.add(tocan + dodatak);
    dodatak++;
  }
  return igraNasumicnoOdaberi([...opcije], 4);
}
