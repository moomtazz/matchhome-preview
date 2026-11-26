(() => {
  'use strict';

  const { properties, checklistGroups } = window.MatchHomeData;
  const Finance = window.MatchHomeFinance;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const byId = new Map(properties.map((property) => [property.id, property]));
  const checklistIds = new Set(checklistGroups.flatMap((group) => group.items.map((item) => item.id)));
  const moneyFormat = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
  const decimalFormat = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 });
  const money = (value) => moneyFormat.format(Math.abs(value) < 0.5 ? 0 : value);
  const compact = (value) => value >= 1e9 ? `Rp${decimalFormat.format(value / 1e9)} miliar` : `Rp${decimalFormat.format(value / 1e6)} juta`;
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const icon = (name) => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const propertyCosts = (property) => property.monthlyCosts.utilities + property.monthlyCosts.management;
  let storageAvailable = true;

  function loadSet(key, allowed, maximum = Infinity) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      if (Array.isArray(value)) return new Set([...new Set(value.filter((id) => allowed.has(id)))].slice(0, maximum));
    } catch { storageAvailable = false; }
    return new Set();
  }

  const favorites = loadSet('matchhome-favorites', byId);
  const comparison = loadSet('matchhome-comparison', byId, 3);
  const completed = loadSet('matchhome-checklist', checklistIds);
  let demoAccount = '';
  try { demoAccount = localStorage.getItem('matchhome-demo-name') || ''; } catch { /* Demo remains available for this page. */ }
  const filters = { query: '', budget: 0, bedrooms: 0, type: 'all', readiness: 'all', feature: 'all', fitOnly: false };
  const homeProperties = [...properties].sort((a, b) => a.price - b.price).slice(0, 2);
  const solarExample = properties.find((property) => property.features?.includes('Panel surya'));
  if (solarExample) homeProperties.push(solarExample);
  let currentView = 'beranda';
  let calculatorStep = 0;
  let planTab = 'saved';
  let activeDetail = null;
  let detailTab = 'biaya';
  let lastCalculation = null;
  let appliedBudget = null;
  const comparisonCommutes = new Map();
  let exampleLoaded = false;
  let toastTimer;

  function notify(message) {
    clearTimeout(toastTimer);
    $('#toast').textContent = message;
    $('#toast').hidden = false;
    toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200);
  }

  function persist(key, values) {
    try {
      localStorage.setItem(key, JSON.stringify([...values]));
      storageAvailable = true;
    } catch {
      storageAvailable = false;
      notify('Penyimpanan browser tidak tersedia. Perubahan hanya berlaku selama sesi ini.');
    }
  }

  function defaultMortgage(property) {
    return Finance.calculateMortgage({ price: property.price, downPaymentPercent: 20, annualRate: 7, tenorYears: 20, fixedYears: 20, floatingRate: 7, feesPercent: 0, feesFlat: 0 });
  }

  function evaluateProperty(property) {
    if (!appliedBudget) return null;
    const mortgage = Finance.calculateMortgage({ ...appliedBudget.options, price: property.price });
    const assessment = Finance.assessAffordability(mortgage, appliedBudget.profile, propertyCosts(property));
    return { mortgage, assessment };
  }

  function fitReason(assessment) {
    if (assessment.cashGap > 0.5) return `Dana awal kurang ${money(assessment.cashGap)} setelah menjaga dana darurat.`;
    if (assessment.normalSurplus < -0.5) return `Anggaran awal defisit ${money(-assessment.normalSurplus)}/bulan.`;
    if (assessment.resetSurplus < -0.5) return `Setelah perubahan bunga, defisit ${money(-assessment.resetSurplus)}/bulan.`;
    if (assessment.historySurplus !== null && assessment.historySurplus < -0.5) return `Pada bulan penghasilan terendah, defisit ${money(-assessment.historySurplus)}/bulan.`;
    if (assessment.stressSurplus < -0.5) return `Saat penghasilan turun, defisit ${money(-assessment.stressSurplus)}/bulan.`;
    return `Sisa anggaran saat uji penghasilan turun: ${money(assessment.stressSurplus)}/bulan.`;
  }

  function favoriteButton(property, inline = false) {
    const selected = favorites.has(property.id);
    return `<button type="button" class="${inline ? 'button secondary save-inline' : 'save-button'}" data-save="${property.id}" aria-pressed="${selected}" aria-label="${selected ? 'Hapus' : 'Simpan'} ${escapeHtml(property.name)} ${selected ? 'dari' : 'ke'} favorit">${icon('heart')}${inline ? (selected ? 'Tersimpan' : 'Simpan hunian') : ''}</button>`;
  }

  function propertyCard(property) {
    const evaluation = evaluateProperty(property);
    const mortgage = evaluation ? evaluation.mortgage : defaultMortgage(property);
    return `<article class="property-card" data-property="${property.id}">
      <div class="card-image"><button type="button" class="card-photo-button" data-detail="${property.id}" aria-label="Buka ${escapeHtml(property.name)}"><img src="assets/${property.image}.jpg" alt="Ilustrasi ${escapeHtml(property.name)}" loading="lazy"></button>${favoriteButton(property)}<span class="image-type">${escapeHtml(property.type)}</span></div>
      <div class="card-body"><p class="card-price">${compact(property.price)}</p><h3><button class="card-title" type="button" data-detail="${property.id}">${escapeHtml(property.name)}</button></h3><p class="card-location">${icon('pin')}${escapeHtml(property.district)}, ${escapeHtml(property.city)}</p>
      <div class="card-specs"><span>${icon('bed')}${property.beds} KT · ${property.baths} KM</span><span>${icon('area')}LB ${property.building} m²</span>${property.land ? `<span>LT ${property.land} m²</span>` : ''}</div>
      <div class="card-status"><span class="status-label">${escapeHtml(property.readiness)}</span><span>Dokumen belum diperiksa</span></div>
      ${property.features?.length ? `<p class="monthly-hint">Ciri hunian: ${property.features.map(escapeHtml).join(' · ')}</p>` : ''}
      <p class="monthly-hint">Estimasi cicilan ${evaluation ? 'awal' : ''} <strong>${money(mortgage.initialPayment)}/bln</strong>${evaluation ? `<br>Sesuai skenario anggaran yang diterapkan` : ''}</p>
      ${evaluation ? `<p class="card-fit ${evaluation.assessment.fits ? 'fits' : ''}"><strong>${evaluation.assessment.fits ? 'Masuk asumsi anggaran' : 'Belum masuk asumsi anggaran'}</strong><br>${fitReason(evaluation.assessment)}</p>` : ''}
      <div class="card-actions"><label class="compare-label"><input type="checkbox" data-compare="${property.id}" ${comparison.has(property.id) ? 'checked' : ''}>Bandingkan</label><button type="button" class="detail-button" data-detail="${property.id}" aria-label="Lihat detail ${escapeHtml(property.name)}">Lihat detail ${icon('arrow')}</button></div><button type="button" class="button secondary contact-button" data-contact-demo="${property.id}" aria-label="Hubungi tentang ${escapeHtml(property.name)} melalui WhatsApp">${icon('chat')} WhatsApp</button></div>
    </article>`;
  }

  function renderListings() {
    const query = filters.query.toLocaleLowerCase('id-ID');
    let results = properties.filter((property) =>
      (!query || `${property.name} ${property.district} ${property.city}`.toLocaleLowerCase('id-ID').includes(query)) &&
      (!filters.budget || property.price <= filters.budget) && property.beds >= filters.bedrooms &&
      (filters.type === 'all' || property.type === filters.type) &&
      (filters.readiness === 'all' || property.readiness === filters.readiness) &&
      (filters.feature === 'all' || (property.features || []).includes(filters.feature)) &&
      (!filters.fitOnly || (appliedBudget && evaluateProperty(property).assessment.fits))
    );
    const sort = $('#sort').value;
    if (sort === 'lowest') results.sort((a, b) => a.price - b.price);
    if (sort === 'highest') results.sort((a, b) => b.price - a.price);
    if (sort === 'largest') results.sort((a, b) => b.building - a.building);
    if (sort === 'affordable' && appliedBudget) {
      const assessments = new Map(results.map((property) => [property.id, evaluateProperty(property).assessment]));
      results.sort((a, b) => {
        const first = assessments.get(a.id);
        const second = assessments.get(b.id);
        return Number(second.fits) - Number(first.fits) || first.cashGap - second.cashGap || second.stressSurplus - first.stressSurplus;
      });
    }
    $('#property-grid').innerHTML = results.map(propertyCard).join('');
    $('#home-property-grid').innerHTML = homeProperties.map(propertyCard).join('');
    $('#result-count').innerHTML = `<strong>${results.length} hunian</strong> dari ${properties.length} listing contoh${filters.fitOnly ? ' · sesuai asumsi anggaran' : ''}`;
    $('.listing-footnote').textContent = appliedBudget
      ? 'Cicilan mengikuti anggaran yang diterapkan, dengan biaya rutin masing-masing rumah.'
      : 'Asumsi cicilan: DP 20%, bunga 7% per tahun, tenor 20 tahun.';
    $('#home-listing-note').textContent = $('.listing-footnote').textContent;
    $('#empty-state').hidden = results.length > 0;
    $('#empty-state p').textContent = filters.fitOnly ? 'Tidak ada pilihan yang memenuhi seluruh asumsi arus kas dan dana awal saat ini. Ubah skenario atau nonaktifkan filter anggaran; jangan memaksakan pembelian.' : 'Belum ada data simulasi untuk pencarian ini. Coba lokasi lain atau ubah filter.';
    $('#sort option[value="affordable"]').disabled = !appliedBudget;
    renderSaved();
    syncComparison();
  }

  function renderSaved() {
    $('#saved-count').textContent = favorites.size;
    $('#plan-saved-count').textContent = favorites.size;
    $('#saved-grid').innerHTML = properties.filter((property) => favorites.has(property.id)).map(propertyCard).join('');
    $('#saved-empty').hidden = favorites.size > 0;
  }

  function renderBudgetBanner() {
    const banner = $('#budget-banner');
    banner.classList.toggle('applied', Boolean(appliedBudget));
    if (!appliedBudget) {
      banner.innerHTML = `<div><strong>Belum ada anggaran yang diterapkan</strong><p>Hitung anggaran untuk membandingkan dana awal dan sisa bulanan tiap hunian.</p></div><a href="#simulasi" class="text-link">Hitung anggaran <span>↗</span></a>`;
      return;
    }
    const count = properties.filter((property) => evaluateProperty(property).assessment.fits).length;
    banner.innerHTML = `<div><strong>${count} dari ${properties.length} hunian sesuai anggaran</strong><p>Penghasilan bersih ${money(appliedBudget.profile.income)}/bulan, dengan uji penurunan ${appliedBudget.profile.incomeDropPercent}%${appliedBudget.profile.lowestMonthlyIncome !== undefined ? ' dan bulan terendah' : ''}.</p></div><a href="#simulasi" class="text-link">Ubah isian <span>↗</span></a><label class="budget-toggle"><input type="checkbox" id="fit-only" ${filters.fitOnly ? 'checked' : ''}>Hanya yang sesuai anggaran</label><button type="button" class="text-button" id="clear-budget">Lepas anggaran</button>`;
  }

  function resetFilters() {
    Object.assign(filters, { query: '', budget: 0, bedrooms: 0, type: 'all', readiness: 'all', feature: 'all', fitOnly: false });
    $('#search-form').reset();
    $('#readiness').value = 'all';
    $('#feature').value = 'all';
    $('#sort').value = 'recommended';
    $$('[data-type]').forEach((button) => {
      const active = button.dataset.type === 'all';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active);
    });
    const fitToggle = $('#fit-only');
    if (fitToggle) fitToggle.checked = false;
    renderListings();
  }

  function toggleFavorite(id) {
    const property = byId.get(id);
    if (!property) return;
    const selected = favorites.has(id);
    if (selected) favorites.delete(id);
    else favorites.add(id);
    persist('matchhome-favorites', favorites);
    renderListings();
    if (activeDetail === id) {
      const button = $('#detail-content [data-save]');
      button.outerHTML = favoriteButton(property, true);
      $('#detail-content [data-save]').focus({ preventScroll: true });
    } else {
      const container = currentView === 'beranda' ? '#home-property-grid' : currentView === 'rencana' ? '#saved-grid' : '#property-grid';
      $(`${container} [data-save="${id}"]`)?.focus({ preventScroll: true });
    }
    if (storageAvailable) notify(selected ? 'Hunian dihapus dari rencana.' : 'Hunian disimpan pada browser ini.');
  }

  function syncComparison() {
    $$('[data-compare]').forEach((input) => {
      const selected = comparison.has(input.dataset.compare);
      input.checked = selected;
      input.disabled = comparison.size >= 3 && !selected;
      input.title = input.disabled ? 'Maksimal 3 hunian. Hapus salah satu pilihan terlebih dahulu.' : '';
    });
    $('#compare-bar').hidden = comparison.size === 0 || !['beranda', 'jelajah', 'rencana'].includes(currentView);
    $('#compare-count').textContent = `${comparison.size} hunian dipilih`;
    $('#open-compare').disabled = comparison.size < 2;
    const button = $('#detail-content [data-toggle-compare]');
    if (button && activeDetail) {
      const selected = comparison.has(activeDetail);
      button.innerHTML = `${icon('compare')}${selected ? 'Hapus perbandingan' : 'Bandingkan'}`;
      button.setAttribute('aria-pressed', selected);
      button.disabled = comparison.size >= 3 && !selected;
    }
  }

  function toggleComparison(id) {
    if (!byId.has(id)) return;
    if (comparison.has(id)) comparison.delete(id);
    else {
      if (comparison.size >= 3) { notify('Maksimal 3 hunian. Hapus salah satu pilihan terlebih dahulu.'); return; }
      comparison.add(id);
    }
    persist('matchhome-comparison', comparison);
    syncComparison();
    if ($('#compare-dialog').open) {
      if (comparison.size < 2) { $('#compare-dialog').close(); notify('Pilih setidaknya 2 hunian untuk membandingkan.'); }
      else renderComparison();
    }
  }

  function renderComparison() {
    const selection = [...comparison].map((id) => byId.get(id));
    const row = (label, cells) => `<tr><th scope="row">${label}</th>${cells.map((cell) => `<td>${cell}</td>`).join('')}</tr>`;
    const finances = selection.map((property) => evaluateProperty(property) || { mortgage: defaultMortgage(property), assessment: null });
    $('#compare-content').innerHTML = `<div class="compare-table-wrap" tabindex="0" aria-label="Tabel perbandingan, geser ke samping pada layar kecil"><table class="compare-table"><thead><tr><th scope="col">Spesifikasi</th>${selection.map((property) => `<th scope="col"><img src="assets/${property.image}.jpg" alt="Foto ilustrasi ${escapeHtml(property.name)}"><h3>${escapeHtml(property.name)}</h3><span>${escapeHtml(property.district)}, ${escapeHtml(property.city)}</span><br><button type="button" class="remove-item" data-remove-compare="${property.id}" aria-label="Hapus ${escapeHtml(property.name)} dari perbandingan">Hapus pilihan</button></th>`).join('')}</tr></thead><tbody>
      ${row('Harga contoh', selection.map((property) => `<strong>${money(property.price)}</strong>`))}
      ${row('Kamar', selection.map((property) => `${property.beds} tidur · ${property.baths} mandi`))}
      ${row('Luas bangunan / tanah', selection.map((property) => `${property.building} m² / ${property.land ? `${property.land} m²` : '—'}`))}
      ${row('Lantai / listrik', selection.map((property) => `${escapeHtml(property.details?.floors || 'Belum ada informasi')}<br>${escapeHtml(property.details?.electricity || 'Daya listrik belum diketahui')}`))}
      ${row('Kondisi ilustratif', selection.map((property) => escapeHtml(property.readiness)))}
      ${row('Ciri hunian', selection.map((property) => (property.features || []).map(escapeHtml).join('<br>') || 'Belum ada informasi'))}
      ${row('Jenis sertipikat', selection.map((property) => `${property.documentType}<br>Belum diperiksa`))}
      ${row('Cicilan awal / bulan', finances.map((result) => money(result.mortgage.initialPayment)))}
      ${appliedBudget ? row('Cicilan setelah bunga awal', finances.map((result) => money(result.mortgage.laterPayment))) : ''}
      ${row('DP', finances.map((result) => money(result.mortgage.downPayment)))}
      ${appliedBudget ? row('Dana awal termasuk biaya', finances.map((result) => money(result.mortgage.totalCash))) : ''}
      ${row('Biaya rutin / bulan', selection.map((property) => `${money(propertyCosts(property))}<br><small>Utilitas & pengelolaan, asumsi</small>`))}
      ${appliedBudget ? row('Perjalanan pribadi / bulan', selection.map((property) => `<label class="compare-commute"><span class="sr-only">Biaya perjalanan pribadi per bulan untuk ${escapeHtml(property.name)}</span><span>Rp</span><input type="number" min="0" max="1000000000" step="1" required inputmode="numeric" data-compare-commute="${property.id}" value="${comparisonCommutes.get(property.id) ?? appliedBudget.profile.commuteCosts}"></label>`)) : ''}
      ${appliedBudget ? row(appliedBudget.profile.lowestMonthlyIncome !== undefined ? 'Sisa bulan rata-rata' : 'Sisa penghasilan bulanan', selection.map((property) => `<span data-compare-normal="${property.id}"></span>`)) : ''}
      ${appliedBudget && appliedBudget.profile.lowestMonthlyIncome !== undefined ? row('Sisa bulan terendah', selection.map((property) => `<span data-compare-low="${property.id}"></span>`)) : ''}
      ${appliedBudget ? row('Hasil terhadap anggaran', selection.map((property) => `<span data-compare-result="${property.id}"></span>`)) : ''}
      ${row('Langkah berikutnya', selection.map((property) => `<button type="button" class="button secondary" data-simulate="${property.id}">Hitung anggaran</button>`))}
    </tbody></table></div><p class="compare-caption">${appliedBudget ? 'Ubah biaya perjalanan pribadi untuk tiap rumah; awalnya memakai angka dari simulasi. Jangan masukkan lagi biaya perjalanan usaha atau biaya yang sudah ada di pengeluaran lain. Sisa bulan rata-rata memakai cicilan awal; bulan terendah memakai cicilan tertinggi dari dua fase. Perubahan perjalanan hanya berlaku di tabel ini dan selama halaman terbuka; katalog tetap memakai biaya perjalanan dari simulasi. Bukan prediksi atau keputusan kredit.' : 'Asumsi pembiayaan: DP 20%, bunga 7% tetap selama 20 tahun. DP belum mencakup biaya transaksi. Hitung dan terapkan anggaran untuk membandingkan sisa uang serta biaya perjalanan tiap rumah.'} Seluruh data/foto adalah ilustrasi; biaya rutin adalah asumsi dan dokumen belum diperiksa.</p>`;
    if (appliedBudget) selection.forEach(updateComparisonBudget);
  }

  function updateComparisonBudget(property) {
    const input = $(`[data-compare-commute="${property.id}"]`);
    const normal = $(`[data-compare-normal="${property.id}"]`);
    const low = $(`[data-compare-low="${property.id}"]`);
    const result = $(`[data-compare-result="${property.id}"]`);
    if (!input || !appliedBudget) return;
    if (!input.validity.valid || input.value.trim() === '') {
      comparisonCommutes.delete(property.id);
      normal.textContent = 'Isi biaya perjalanan yang valid.';
      if (low) low.textContent = 'Belum dapat dihitung.';
      result.textContent = 'Belum dapat dihitung.';
      return;
    }
    const commute = Number(input.value);
    comparisonCommutes.set(property.id, commute);
    const mortgage = Finance.calculateMortgage({ ...appliedBudget.options, price: property.price });
    const assessment = Finance.assessAffordability(mortgage, { ...appliedBudget.profile, commuteCosts: commute }, propertyCosts(property));
    normal.textContent = `${money(assessment.normalSurplus)} / bulan`;
    if (low) low.textContent = `${money(assessment.historySurplus)} / bulan`;
    result.innerHTML = `<strong>${assessment.fits ? 'Masuk asumsi' : 'Belum masuk asumsi'}</strong><br>${fitReason(assessment)}`;
  }

  function detailPanel(property) {
    if (detailTab === 'lingkungan') {
      return `<p>Informasi lokasi berikut belum diperiksa dan tidak menjamin kondisi atau keselamatan rumah.</p><dl class="receipt"><div><dt>Riwayat banjir</dt><dd>Belum diketahui</dd></div><div><dt>Drainase dan akses jalan</dt><dd>Perlu pemeriksaan lapangan</dd></div><div><dt>Fasilitas sekitar</dt><dd>${escapeHtml(property.details?.access || 'Belum ada informasi')}</dd></div></dl><p>Tanyakan riwayat genangan kepada warga dan pengelola, periksa akses saat hujan, dan lihat informasi wilayah dari <a class="text-link" href="https://inarisk.bnpb.go.id/" target="_blank" rel="noopener noreferrer">InaRISK BNPB ↗</a>. Peta wilayah tidak memastikan kondisi satu rumah.</p>`;
    }
    if (detailTab === 'dokumen') {
      return `<p>Tidak ada dokumen asli atau pemeriksaan legal dalam prototipe. Tautan di bawah adalah rujukan proses, bukan bukti pemeriksaan unit.</p><div class="document-grid">${property.documents.map((document) => `<article class="document-item"><h4>${escapeHtml(document.name)}</h4><span class="document-state">${escapeHtml(document.status)}</span><p>${escapeHtml(document.note)}</p><dl><dt>Sumber</dt><dd>${escapeHtml(document.source)}</dd><dt>Pemeriksa / tanggal</dt><dd>${escapeHtml(document.reviewer)} / ${escapeHtml(document.date)}</dd></dl>${document.officialUrl ? `<a href="${escapeHtml(document.officialUrl)}" target="_blank" rel="noopener noreferrer">Rujukan resmi ↗</a>` : ''}</article>`).join('')}</div>`;
    }
    if (detailTab === 'riwayat') {
      return `<p>Contoh tampilan riwayat perubahan. Bukan transaksi nyata, register hak, atau pencatatan blockchain.</p><ol class="timeline">${property.timeline.map((event) => `<li><time datetime="${event.date}">${new Date(`${event.date}T12:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} · ilustrasi</time><h4>${escapeHtml(event.title)}</h4><p>${escapeHtml(event.detail)}</p><small>${escapeHtml(event.actor)}</small></li>`).join('')}</ol>`;
    }
    const evaluation = evaluateProperty(property);
    const mortgage = evaluation ? evaluation.mortgage : defaultMortgage(property);
    return `<p>${evaluation ? 'Menggunakan skenario anggaran yang kamu terapkan di katalog.' : 'Contoh pembiayaan: DP 20%, bunga 7% tetap, tenor 20 tahun. Ubah di halaman anggaran untuk kondisi lain.'}</p><dl class="receipt"><div><dt>Uang muka</dt><dd>${money(mortgage.downPayment)}</dd></div><div><dt>Cicilan awal / bulan</dt><dd>${money(mortgage.initialPayment)}</dd></div>${evaluation ? `<div><dt>Cicilan setelah masa bunga awal</dt><dd>${money(mortgage.laterPayment)}</dd></div><div><dt>Dana awal termasuk biaya yang diisi</dt><dd>${money(mortgage.totalCash)}</dd></div>` : ''}<div><dt>Utilitas / bulan (asumsi)</dt><dd>${money(property.monthlyCosts.utilities)}</dd></div><div><dt>Pengelolaan / bulan (asumsi)</dt><dd>${money(property.monthlyCosts.management)}</dd></div></dl>${evaluation ? `<p class="card-fit ${evaluation.assessment.fits ? 'fits' : ''}"><strong>${evaluation.assessment.fits ? 'Masuk asumsi anggaran' : 'Belum masuk asumsi anggaran'}</strong><br>${fitReason(evaluation.assessment)}</p>` : '<p>Biaya transaksi, biaya pindah, dan transportasi belum termasuk. Angka bukan tarif bank atau penawaran developer.</p>'}`;
  }

  function showDetail(id) {
    const property = byId.get(id);
    if (!property) return;
    activeDetail = id;
    detailTab = 'biaya';
    $('#detail-content').innerHTML = `<div class="detail-photo"><img class="detail-image" src="assets/${property.image}.jpg" alt="Ilustrasi ${escapeHtml(property.name)}"></div><div class="detail-body"><div class="detail-top"><div><p class="eyebrow">${escapeHtml(property.type)} · ${escapeHtml(property.readiness)}</p><h2 id="detail-title">${escapeHtml(property.name)}</h2><p class="detail-location">${escapeHtml(property.district)}, ${escapeHtml(property.city)}</p></div><div><p class="detail-price">${money(property.price)}</p><span class="detail-price-caption">Harga properti</span></div></div><div class="detail-specs"><span>${icon('bed')}${property.beds} kamar tidur · ${property.baths} kamar mandi</span><span>${icon('area')}LB ${property.building} m²${property.land ? ` · LT ${property.land} m²` : ''}</span><span>${property.documentType} · belum diperiksa</span></div><p class="detail-description">${escapeHtml(property.description)}<br>Pengembang: ${escapeHtml(property.developer)}</p><dl class="receipt"><div><dt>Jumlah lantai</dt><dd>${escapeHtml(property.details?.floors || 'Belum ada informasi')}</dd></div><div><dt>Daya listrik</dt><dd>${escapeHtml(property.details?.electricity || 'Belum ada informasi')}</dd></div><div><dt>Sumber air</dt><dd>${escapeHtml(property.details?.water || 'Belum ada informasi')}</dd></div><div><dt>Furnitur</dt><dd>${escapeHtml(property.details?.furnishing || 'Belum ada informasi')}</dd></div></dl><div class="amenities">${[...property.amenities, ...(property.features || [])].map((amenity) => `<span>${escapeHtml(amenity)}</span>`).join('')}</div>${property.features?.length ? '<p>Ciri hunian adalah data simulasi, bukan sertifikasi atau jaminan penghematan. Biaya listrik dan air tidak dihitung berdasarkan ciri tersebut.</p>' : ''}<div class="detail-tabs" role="group" aria-label="Informasi properti"><button type="button" class="active" data-detail-tab="biaya" aria-pressed="true">Biaya hunian</button><button type="button" data-detail-tab="lingkungan" aria-pressed="false">Lokasi & lingkungan</button><button type="button" data-detail-tab="dokumen" aria-pressed="false">Status dokumen</button><button type="button" data-detail-tab="riwayat" aria-pressed="false">Riwayat contoh</button></div><div id="detail-tab-panel" class="detail-tab-panel">${detailPanel(property)}</div><div class="detail-actions"><button type="button" class="button primary" data-simulate="${property.id}">Hitung anggaran rumah ini ${icon('arrow')}</button>${favoriteButton(property, true)}<button type="button" class="button secondary" data-toggle-compare="${property.id}" aria-pressed="false">${icon('compare')}Bandingkan</button></div></div>`;
    $('#detail-content .detail-actions').insertAdjacentHTML('beforeend', `<button type="button" class="button secondary" data-contact-demo="${property.id}">${icon('chat')} WhatsApp / jadwalkan kunjungan</button>`);
    if (!$('#property-dialog').open) $('#property-dialog').showModal();
    $('#property-dialog').scrollTop = 0;
    syncComparison();
  }

  const optionFields = { price: '#calc-price', downPaymentPercent: '#calc-dp', annualRate: '#calc-rate', tenorYears: '#calc-years', fixedYears: '#calc-fixed', floatingRate: '#calc-floating', feesPercent: '#calc-fees-percent', feesFlat: '#calc-fees-flat' };
  const profileFields = { income: '#calc-income', otherDebt: '#calc-debt', livingCosts: '#calc-living', commuteCosts: '#calc-commute', monthlyBuffer: '#calc-buffer', savings: '#calc-savings', emergencyReserve: '#calc-reserve', incomeDropPercent: '#calc-income-drop' };
  const readFields = (fields) => Object.fromEntries(Object.entries(fields).map(([name, selector]) => [name, $(selector).valueAsNumber]));

  function receiptRow(label, value, className = '') {
    return `<div><dt>${label}</dt><dd class="${className}">${money(value)}</dd></div>`;
  }

  function renderIncomeMonths() {
    const now = new Date();
    $('#income-months').innerHTML = Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1)
        .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      return `<div class="income-month"><span class="income-month-label">${month}<small class="income-net" id="income-net-${index}">Bersih: —</small></span><label>Pemasukan (Rp)<input id="income-revenue-${index}" type="number" min="0" max="1000000000000" step="1" required aria-label="Pemasukan ${month} (Rp)"></label><label>Biaya usaha (Rp)<input id="income-costs-${index}" type="number" min="0" max="1000000000000" step="1" required aria-label="Biaya usaha ${month} (Rp)"></label></div>`;
    }).join('');
  }

  function syncIncomeMode() {
    const mode = $('#income-mode').value;
    $('#variable-income').hidden = mode !== 'variable';
    $('#variable-income').disabled = mode !== 'variable';
    $('#fixed-income').hidden = mode !== 'fixed';
    $('#fixed-income').disabled = mode !== 'fixed';
  }

  function setCalculatorStep(step, focus = false) {
    calculatorStep = step;
    $$('[data-calculator-panel]').forEach((panel) => {
      panel.hidden = Number(panel.dataset.calculatorPanel) !== step;
    });
    $$('[data-calculator-step]').forEach((button) => {
      const index = Number(button.dataset.calculatorStep);
      button.classList.toggle('completed', index < step);
      if (index === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    $('#calculator-back').hidden = step === 0;
    $('#calculator-next').hidden = step === 2;
    $('#calculator-submit').hidden = step !== 2;
    $('#calculator-next').innerHTML = `${step === 0 ? 'Lanjut ke kebutuhan' : 'Lanjut ke rumah'} ${icon('arrow')}`;
    $('#calculator-error').hidden = true;
    if (focus) {
      $('#calculator-form').scrollIntoView({ block: 'start' });
      $(`[data-calculator-panel="${step}"]`).querySelector('input:not(:disabled), select:not(:disabled)')?.focus({ preventScroll: true });
    }
  }

  function requestCalculatorStep(step) {
    if (step > calculatorStep) {
      for (let index = 0; index < step; index++) {
        const panel = $(`[data-calculator-panel="${index}"]`);
        const invalid = [...panel.querySelectorAll('input, select')].find((input) => input.willValidate && !input.checkValidity());
        if (invalid) {
          setCalculatorStep(index, true);
          $('#calculator-error').textContent = 'Lengkapi langkah ini sebelum melanjutkan. Isi 0 bila tidak ada.';
          $('#calculator-error').hidden = false;
          invalid.reportValidity();
          return;
        }
      }
    }
    setCalculatorStep(step, true);
  }

  function renderIncomeSummary() {
    let complete = true;
    const months = Array.from({ length: 6 }, (_, index) => {
      const revenue = $(`#income-revenue-${index}`);
      const costs = $(`#income-costs-${index}`);
      const valid = Number.isFinite(revenue.valueAsNumber) && Number.isFinite(costs.valueAsNumber) && revenue.validity.valid && costs.validity.valid;
      const net = revenue.valueAsNumber - costs.valueAsNumber;
      $(`#income-net-${index}`).textContent = valid ? `Bersih: ${money(net)}` : 'Bersih: —';
      $(`#income-net-${index}`).classList.toggle('negative', valid && net < 0);
      if (!valid) complete = false;
      return { revenue: revenue.valueAsNumber, costs: costs.valueAsNumber };
    });
    if (!complete) {
      $('#income-summary').innerHTML = '<p>Isi keenam bulan untuk melihat penghasilan bersih rata-rata dan bulan terendah. Angka nol tetap dihitung sebagai satu bulan.</p>';
      return null;
    }
    const summary = Finance.summarizeIncome(months);
    $('#income-summary').innerHTML = `<p class="result-equation">Penghasilan bersih = pemasukan − biaya usaha.</p><dl class="receipt">${receiptRow('Total pemasukan enam bulan', summary.totalRevenue)}${receiptRow('Total biaya usaha enam bulan', summary.totalCosts)}${receiptRow('Rata-rata bersih per bulan', summary.average, summary.average < 0 ? 'negative' : '')}${receiptRow('Bulan bersih terendah', summary.minimum, summary.minimum < 0 ? 'negative' : '')}</dl><p>Rata-rata = (${money(summary.totalRevenue)} − ${money(summary.totalCosts)}) ÷ 6. Ini catatan yang kamu isi, bukan verifikasi pendapatan atau prediksi.</p>${summary.minimum < 0 ? '<p class="income-warning">Ada bulan dengan biaya usaha melebihi pemasukan. Kerugian tetap dihitung, tidak diubah menjadi nol.</p>' : ''}`;
    return summary;
  }

  function clearCalculation(message = 'Isi penghasilan, kebutuhan rumah tangga, dan harga rumah untuk menghitung anggaran.') {
    lastCalculation = null;
    $('#apply-budget').disabled = true;
    $('#apply-budget').hidden = true;
    $('#calculation-output').innerHTML = `<div class="result-empty"><h2>Belum ada perhitungan</h2><p>${escapeHtml(message)}</p></div>`;
  }

  function calculateForm() {
    if (!$('#calculator-form').checkValidity()) {
      clearCalculation('Lengkapi isian yang belum valid. Kolom kosong tidak dihitung sebagai nol.');
      $('#calculator-error').textContent = 'Lengkapi isian yang ditandai. Isi 0 bila tidak ada pemasukan, biaya, atau tabungan.';
      $('#calculator-error').hidden = false;
      const invalid = $('#calculator-form').querySelector('input:invalid, select:invalid');
      const panel = invalid?.closest('[data-calculator-panel]');
      if (panel) setCalculatorStep(Number(panel.dataset.calculatorPanel), true);
      $('#calculator-error').hidden = false;
      invalid?.reportValidity();
      return false;
    }
    try {
      const options = readFields(optionFields);
      const profile = readFields(profileFields);
      const incomeSummary = $('#income-mode').value === 'variable' ? renderIncomeSummary() : null;
      if (incomeSummary) {
        profile.income = incomeSummary.average;
        profile.lowestMonthlyIncome = incomeSummary.minimum;
      }
      const houseCosts = Number($('#calc-house-costs').value);
      const mortgage = Finance.calculateMortgage(options);
      const assessment = Finance.assessAffordability(mortgage, profile, houseCosts);
      lastCalculation = { options, profile, houseCosts, mortgage, assessment, incomeSummary };
      $('#calculator-error').hidden = true;
      renderCalculation();
      $('#apply-budget').disabled = false;
      $('#apply-budget').hidden = false;
      $('#calculation-result').setAttribute('tabindex', '-1');
      return true;
    } catch {
      clearCalculation('Perhitungan belum tersedia. Periksa kembali isian pembiayaan dan anggaran.');
      $('#calculator-error').textContent = 'Periksa kembali nilai pembiayaan dan anggaran. Gunakan angka dalam rentang yang tercantum.';
      $('#calculator-error').hidden = false;
      $('#apply-budget').disabled = true;
      return false;
    }
  }

  function renderCalculation() {
    const { options, profile, houseCosts, mortgage, assessment, incomeSummary } = lastCalculation;
    const hasReset = mortgage.firstPeriodMonths > 0 && mortgage.firstPeriodMonths < options.tenorYears * 12;
    const period = mortgage.principal === 0 ? 'DP 100%: tidak ada pinjaman atau angsuran.' : mortgage.firstPeriodMonths === 0
      ? `Bunga ${options.floatingRate}% digunakan sejak bulan pertama.`
      : `Bulan 1–${mortgage.firstPeriodMonths} · bunga ${options.annualRate}% per tahun.`;
    const balanceRow = (label, value) => `<div><dt>${label}</dt><dd class="${value < -0.5 ? 'negative' : ''}">${value < -0.5 ? 'Defisit' : 'Sisa'} ${money(Math.abs(value))}</dd></div>`;
    const conclusion = assessment.cashGap > 0.5 ? `Dana awal kurang ${money(assessment.cashGap)}`
      : assessment.historySurplus !== null && assessment.historySurplus < -0.5 ? `Bulan terendah defisit ${money(-assessment.historySurplus)}`
      : assessment.normalSurplus < -0.5 ? `Anggaran bulanan defisit ${money(-assessment.normalSurplus)}`
      : assessment.resetSurplus < -0.5 ? `Setelah perubahan bunga, defisit ${money(-assessment.resetSurplus)}`
      : assessment.stressSurplus < -0.5 ? `Saat penghasilan turun, defisit ${money(-assessment.stressSurplus)}`
      : 'Tidak defisit pada skenario yang diisi';
    const monthlyCosts = profile.livingCosts + profile.otherDebt + profile.commuteCosts + profile.monthlyBuffer + houseCosts;
    $('#calculation-output').innerHTML = `
      ${exampleLoaded ? '<p class="income-warning">Berawal dari contoh perhitungan. Periksa seluruh isian sebelum memakai angka sendiri.</p>' : ''}
      <p class="payment-label">${mortgage.principal === 0 ? 'Tanpa pinjaman' : 'Estimasi cicilan awal'}</p>
      <div id="monthly-payment" class="monthly-payment">${money(mortgage.initialPayment)} <small>/ bulan</small></div>
      <p class="payment-period">${period}</p>
      ${hasReset ? `<div class="reset-payment"><span>Mulai bulan ${mortgage.firstPeriodMonths + 1}<br><small>Asumsi bunga ${options.floatingRate}% per tahun</small></span><strong id="later-payment">${money(mortgage.laterPayment)}/bln</strong></div>` : ''}
      <div class="result-assessment ${assessment.fits ? 'fits' : ''}"><h3>${conclusion}</h3><p>${assessment.fits ? 'Hasil ini hanya berlaku untuk angka yang diisi, bukan persetujuan KPR.' : 'Periksa semua kekurangan pada rincian di bawah; masalahnya dapat lebih dari satu.'}</p></div>
      <section class="result-section"><h3>1. Dana yang perlu disiapkan</h3>
        <dl class="receipt">
          ${receiptRow('Uang muka', mortgage.downPayment)}
          ${receiptRow('Biaya transaksi yang diisi', mortgage.upfrontFees)}
          <div class="receipt-total"><dt>Dana awal (DP + biaya)</dt><dd id="initial-cash">${money(mortgage.totalCash)}</dd></div>
          ${receiptRow('Tabungan tersedia', profile.savings)}
          ${receiptRow('Dana darurat yang dipertahankan', profile.emergencyReserve)}
          ${receiptRow('Tabungan setelah dana darurat', assessment.cashAvailable)}
          ${receiptRow('Kekurangan dana awal + dana darurat', assessment.cashGap, assessment.cashGap > 0.5 ? 'negative' : '')}
        </dl><p class="result-equation">Kekurangan = dana awal + dana darurat − tabungan; paling sedikit Rp0.</p>
      </section>
      <section class="result-section"><h3>2. Arus kas per bulan</h3>
        <dl class="receipt">
          ${receiptRow(incomeSummary ? 'Rata-rata penghasilan bersih enam bulan' : 'Penghasilan bersih', profile.income, profile.income < 0 ? 'negative' : '')}
          ${receiptRow('Biaya hidup', profile.livingCosts)}
          ${receiptRow('Cicilan lain', profile.otherDebt)}
          ${receiptRow('Transportasi pribadi', profile.commuteCosts)}
          ${receiptRow('Cadangan bulanan', profile.monthlyBuffer)}
          ${receiptRow('Biaya rutin rumah baru', houseCosts)}
          ${receiptRow('Cicilan rumah awal', mortgage.initialPayment)}
          ${balanceRow('Setelah semua pengeluaran awal', assessment.normalSurplus)}
        </dl><p class="result-equation">${money(profile.income)} − ${money(monthlyCosts)} kebutuhan & cadangan − ${money(mortgage.initialPayment)} cicilan = ${money(assessment.normalSurplus)}.</p>
      </section>
      <section class="result-section"><h3>3. Jika keadaan berubah</h3><dl class="receipt">
        ${balanceRow('Setelah masa bunga awal', assessment.resetSurplus)}
        ${balanceRow(`Penghasilan turun ${profile.incomeDropPercent}%`, assessment.stressSurplus)}
        ${assessment.historySurplus !== null ? balanceRow('Dengan penghasilan bulan terendah', assessment.historySurplus) : ''}
      </dl><p>Uji penurunan${incomeSummary ? ` dan bulan terendah (${money(incomeSummary.minimum)} bersih)` : ''} memakai cicilan tertinggi dari dua fase. Ini skenario, bukan prediksi.</p></section>
      <section class="result-section"><h3>Asumsi yang dipakai</h3><ul class="result-assumptions">
        <li>Harga ${money(options.price)}, DP ${options.downPaymentPercent}%, pinjaman ${money(mortgage.principal)}, tenor ${options.tenorYears} tahun.</li>
        <li>${period}${hasReset ? ` Setelah itu ${options.floatingRate}% per tahun diasumsikan tetap sampai lunas.` : ''}</li>
        <li>Biaya transaksi ${options.feesPercent}% dari harga + ${money(options.feesFlat)}. Biaya yang belum dimasukkan belum terhitung.</li>
        <li>${incomeSummary ? 'Rata-rata bersih enam bulan, dengan pemeriksaan terpisah pada bulan terendah.' : 'Penghasilan bersih tetap sesuai isian.'} Bukan metode penilaian kredit bank.</li>
      </ul></section>
      <details class="calculation-method"><summary>Rincian pinjaman sepanjang tenor</summary><dl class="receipt">${hasReset ? receiptRow('Saldo saat pergantian bunga', mortgage.balanceAtReset) : ''}${receiptRow('Total angsuran', mortgage.totalInstallments)}${receiptRow('Total bunga', mortgage.totalInterest)}</dl></details>`;
  }

  function markCalculationDirty() {
    clearCalculation('Isian berubah. Hitung ulang untuk melihat hasil yang sesuai dengan angka terbaru.');
    $('#calculator-error').hidden = true;
    if (appliedBudget) {
      appliedBudget = null;
      filters.fitOnly = false;
      if ($('#sort').value === 'affordable') $('#sort').value = 'recommended';
      renderBudgetBanner();
      renderListings();
      notify('Anggaran katalog dilepas karena isian berubah. Hitung dan terapkan kembali.');
    }
  }

  function loadExample() {
    const hasData = $$('#calculator-form input:not([value])').some((input) => input.value !== '');
    if (hasData && !window.confirm('Contoh akan mengganti isian finansial saat ini. Lanjutkan?')) return;
    markCalculationDirty();
    $('#income-mode').value = 'variable';
    syncIncomeMode();
    const revenues = [10000000, 8000000, 12000000, 7000000, 11000000, 9000000];
    const costs = [3000000, 2500000, 4000000, 2500000, 3500000, 3000000];
    revenues.forEach((revenue, index) => {
      $(`#income-revenue-${index}`).value = revenue;
      $(`#income-costs-${index}`).value = costs[index];
    });
    const values = {
      'calc-living': 2000000, 'calc-debt': 400000, 'calc-commute': 300000,
      'calc-buffer': 500000, 'calc-savings': 90000000, 'calc-reserve': 20000000,
      'calc-income-drop': 20, 'calc-price': 350000000, 'calc-dp': 20,
      'calc-years': 20, 'calc-rate': 7, 'calc-fixed': 3, 'calc-floating': 10,
      'calc-fees-percent': 3, 'calc-fees-flat': 5000000, 'calc-house-costs': 400000
    };
    Object.entries(values).forEach(([id, value]) => { $(`#${id}`).value = value; });
    $('#calc-property').value = 'custom';
    exampleLoaded = true;
    renderIncomeSummary();
    setCalculatorStep(2);
    if (calculateForm()) {
      $('#calculation-result').focus({ preventScroll: true });
      $('#calculation-result').scrollIntoView({ block: 'start' });
    }
  }

  function simulateProperty(id) {
    const property = byId.get(id);
    if (!property) return;
    $('#calc-property').value = id;
    $('#calc-price').value = property.price;
    $('#calc-house-costs').value = propertyCosts(property);
    markCalculationDirty();
    if ($('#property-dialog').open) $('#property-dialog').close();
    if ($('#compare-dialog').open) $('#compare-dialog').close();
    location.hash = 'simulasi';
    route();
    setCalculatorStep(0);
    window.scrollTo(0, 0);
  }

  function renderChecklist() {
    $('#checklist-groups').innerHTML = checklistGroups.map((group, index) => `<section class="checklist-group"><p class="eyebrow">LANGKAH 0${index + 1}</p><h3>${escapeHtml(group.title)}</h3>${group.items.map((item) => `<div class="check-item"><label><input type="checkbox" data-checklist="${item.id}" ${completed.has(item.id) ? 'checked' : ''}><span><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.hint)}</small></span></label>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Buka rujukan resmi ↗</a>` : ''}</div>`).join('')}</section>`).join('');
    updateChecklistProgress();
  }

  function updateChecklistProgress() {
    $('#checklist-progress').style.width = `${completed.size / checklistIds.size * 100}%`;
    $('#checklist-count').textContent = `${completed.size} dari ${checklistIds.size} persiapan ditandai selesai olehmu.`;
  }

  function switchPlanTab(tab) {
    planTab = tab === 'checklist' ? 'checklist' : 'saved';
    $('#saved-panel').hidden = planTab !== 'saved';
    $('#checklist-panel').hidden = planTab !== 'checklist';
    $$('[data-plan-tab]').forEach((button) => {
      const active = button.dataset.planTab === planTab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active);
    });
  }

  function route() {
    const hash = location.hash.slice(1);
    const aliases = { katalog: 'jelajah', favorit: 'rencana', informasi: 'panduan', tentang: 'panduan', bantuan: 'panduan' };
    const next = aliases[hash] || (['beranda', 'jelajah', 'simulasi', 'rencana', 'panduan'].includes(hash) ? hash : 'beranda');
    const changed = next !== currentView;
    currentView = next;
    $('#home-view').hidden = next !== 'beranda';
    $('#explore-view').hidden = next !== 'jelajah';
    $('#calculator-view').hidden = next !== 'simulasi';
    $('#plan-view').hidden = next !== 'rencana';
    $('#guide-view').hidden = next !== 'panduan';
    $$('[data-view]').forEach((link) => {
      const active = link.dataset.view === next;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    syncComparison();
    if (hash === 'katalog') $('#katalog').scrollIntoView({ block: 'start' });
    else if (hash === 'informasi') $('#data-info').scrollIntoView({ block: 'start' });
    else if (hash === 'tentang') $('#about-matchhome').scrollIntoView({ block: 'start' });
    else if (hash === 'bantuan') $('#help-matchhome').scrollIntoView({ block: 'start' });
    else if (changed) window.scrollTo(0, 0);
    document.title = `${{ beranda: 'Beranda', jelajah: 'Cari hunian', simulasi: 'Hitung anggaran', rencana: 'Rencana saya', panduan: 'Panduan & sumber' }[next]} — MatchHome`;
  }

  $('#home-search').addEventListener('submit', (event) => {
    event.preventDefault();
    resetFilters();
    $('#query').value = $('#home-query').value.trim();
    $('#budget').value = $('#home-budget').value;
    $('#search-form').requestSubmit();
    location.hash = 'jelajah';
    route();
  });
  $('#search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    Object.assign(filters, { query: $('#query').value.trim(), budget: Number($('#budget').value), bedrooms: Number($('#bedrooms').value) });
    renderListings();
  });
  $('.filter-chips').addEventListener('click', (event) => {
    const button = event.target.closest('[data-type]');
    if (!button) return;
    filters.type = button.dataset.type;
    $$('[data-type]').forEach((chip) => { chip.classList.toggle('active', chip === button); chip.setAttribute('aria-pressed', chip === button); });
    renderListings();
  });
  $('#readiness').addEventListener('change', () => { filters.readiness = $('#readiness').value; renderListings(); });
  $('#feature').addEventListener('change', () => { filters.feature = $('#feature').value; renderListings(); });
  $('#sort').addEventListener('change', renderListings);
  $('#reset-filters').addEventListener('click', resetFilters);
  $('#empty-reset').addEventListener('click', resetFilters);
  $('#open-compare').addEventListener('click', () => {
    if (comparison.size < 2) return;
    renderComparison();
    $('#compare-dialog').showModal();
  });
  $('#clear-compare').addEventListener('click', () => {
    comparison.clear(); persist('matchhome-comparison', comparison); syncComparison();
  });
  $('#calculator-form').addEventListener('submit', (event) => {
    event.preventDefault();
    if (calculatorStep < 2) {
      requestCalculatorStep(calculatorStep + 1);
      return;
    }
    if (calculateForm()) {
      $('#calculation-result').focus({ preventScroll: true });
      $('#calculation-result').scrollIntoView({ block: 'start' });
    }
  });
  $('#calculator-form').addEventListener('input', (event) => {
    if (event.target.id === 'calc-price') $('#calc-property').value = 'custom';
    markCalculationDirty();
    if (event.target.closest('#variable-income')) renderIncomeSummary();
  });
  $('#calculator-form').addEventListener('change', (event) => {
    if (event.target.id === 'income-mode') syncIncomeMode();
    markCalculationDirty();
  });
  $('#calculator-next').addEventListener('click', () => requestCalculatorStep(calculatorStep + 1));
  $('#calculator-back').addEventListener('click', () => requestCalculatorStep(calculatorStep - 1));
  $$('[data-calculator-step]').forEach((button) => {
    button.addEventListener('click', () => requestCalculatorStep(Number(button.dataset.calculatorStep)));
  });
  $('#load-example').addEventListener('click', loadExample);
  $('#clear-calculator').addEventListener('click', () => {
    $('#calculator-form').reset();
    exampleLoaded = false;
    syncIncomeMode();
    renderIncomeSummary();
    markCalculationDirty();
    clearCalculation('Data finansial telah dihapus dari halaman ini. Isi ulang atau gunakan contoh perhitungan.');
    setCalculatorStep(0);
    $('#income-mode').focus();
  });
  $('#calc-property').addEventListener('change', () => {
    const property = byId.get($('#calc-property').value);
    if (property) {
      $('#calc-price').value = property.price;
      $('#calc-house-costs').value = propertyCosts(property);
    }
  });
  $('#apply-budget').addEventListener('click', () => {
    if ($('#apply-budget').disabled || !lastCalculation) return;
    appliedBudget = { options: { ...lastCalculation.options }, profile: { ...lastCalculation.profile } };
    comparisonCommutes.clear();
    filters.fitOnly = true;
    $('#sort').value = 'affordable';
    renderBudgetBanner(); renderListings();
    location.hash = 'katalog'; route();
    notify('Skenario diterapkan. Katalog memakai biaya rutin contoh tiap hunian dan biaya perjalanan yang kamu isi.');
  });
  $('#reset-checklist').addEventListener('click', () => {
    completed.clear(); persist('matchhome-checklist', completed); renderChecklist();
  });
  $('#visit-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const result = $('#visit-result');
    result.textContent = `Contoh permintaan: ${$('#visit-date').value}, pukul ${$('#visit-time').value}. Belum dikirim dan belum dikonfirmasi.`;
    result.hidden = false;
  });
  function renderAccount() {
    const signedIn = Boolean(demoAccount);
    $('#account-open').textContent = signedIn ? 'Profil demo' : 'Masuk / Daftar';
    $('#account-title').textContent = signedIn ? 'Profil pengguna demo' : 'Masuk atau daftar';
    $('#account-entry').hidden = signedIn;
    $('#account-profile').hidden = !signedIn;
    $('#account-display').textContent = demoAccount;
    $('#account-saved-count').textContent = `${favorites.size} hunian tersimpan`;
    $('#account-checklist-count').textContent = `${completed.size} persiapan ditandai`;
  }
  $('#account-open').addEventListener('click', () => { renderAccount(); $('#account-dialog').showModal(); });
  $$('[data-account-mode]').forEach((button) => button.addEventListener('click', () => {
    $$('[data-account-mode]').forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
    $('#account-submit').textContent = button.dataset.accountMode === 'daftar' ? 'Daftar ke demo' : 'Masuk ke demo';
  }));
  $('#account-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const name = $('#account-name').value.trim();
    if (!name) { $('#account-name').setCustomValidity('Isi nama panggilan.'); $('#account-name').reportValidity(); return; }
    demoAccount = name;
    try { localStorage.setItem('matchhome-demo-name', name); $('#account-storage-note').hidden = true; }
    catch { $('#account-storage-note').hidden = false; }
    $('#account-form').reset();
    renderAccount();
  });
  $('#account-name').addEventListener('input', () => $('#account-name').setCustomValidity(''));
  $('#account-logout').addEventListener('click', () => {
    demoAccount = '';
    try { localStorage.removeItem('matchhome-demo-name'); } catch { /* No persisted demo name to remove. */ }
    $('#account-storage-note').hidden = true;
    renderAccount();
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.contactDemo) {
      const property = byId.get(target.dataset.contactDemo);
      if ($('#property-dialog').open) $('#property-dialog').close();
      $('#contact-title').textContent = property ? 'Hubungi tentang hunian' : 'Konsultasi WhatsApp';
      $('#contact-property').textContent = property ? `${property.name} · ${property.city}` : 'Konsultasi dengan tim MatchHome';
      $('#visit-form').hidden = !property;
      $('#visit-form').reset();
      $('#visit-result').hidden = true;
      $('#contact-dialog').showModal();
    }
    else if (target.dataset.detail) showDetail(target.dataset.detail);
    else if (target.dataset.save) toggleFavorite(target.dataset.save);
    else if (target.dataset.simulate) simulateProperty(target.dataset.simulate);
    else if (target.dataset.toggleCompare) toggleComparison(target.dataset.toggleCompare);
    else if (target.dataset.removeCompare) toggleComparison(target.dataset.removeCompare);
    else if (target.dataset.planTab) switchPlanTab(target.dataset.planTab);
    else if (target.dataset.detailTab && activeDetail) {
      detailTab = target.dataset.detailTab;
      $$('[data-detail-tab]').forEach((button) => { button.classList.toggle('active', button === target); button.setAttribute('aria-pressed', button === target); });
      $('#detail-tab-panel').innerHTML = detailPanel(byId.get(activeDetail));
    } else if (target.id === 'clear-budget') {
      appliedBudget = null; filters.fitOnly = false;
      if ($('#sort').value === 'affordable') $('#sort').value = 'recommended';
      renderBudgetBanner(); renderListings();
    }
  });
  document.addEventListener('change', (event) => {
    const input = event.target;
    if (input.dataset.compare) toggleComparison(input.dataset.compare);
    else if (input.dataset.checklist) {
      if (input.checked) completed.add(input.dataset.checklist);
      else completed.delete(input.dataset.checklist);
      persist('matchhome-checklist', completed); updateChecklistProgress();
    } else if (input.id === 'fit-only') { filters.fitOnly = input.checked; renderListings(); }
  });
  $('#compare-content').addEventListener('input', (event) => {
    const property = byId.get(event.target.dataset.compareCommute);
    if (property) updateComparisonBudget(property);
  });
  $$('dialog').forEach((dialog) => {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (event) => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
  });
  $('#property-dialog').addEventListener('close', () => { activeDetail = null; });
  window.addEventListener('hashchange', route);

  $('#calc-property').insertAdjacentHTML('beforeend', properties.map((property) => `<option value="${property.id}">${escapeHtml(property.name)} — ${compact(property.price)}</option>`).join(''));
  renderAccount();
  $('#home-locations').innerHTML = [...new Set(properties.map((property) => property.city))].sort((a, b) => a.localeCompare(b, 'id')).map((city) => `<option value="${escapeHtml(city)}"></option>`).join('');
  renderIncomeMonths();
  syncIncomeMode();
  setCalculatorStep(0);
  renderChecklist();
  switchPlanTab('saved');
  renderBudgetBanner();
  renderListings();
  route();
})();
