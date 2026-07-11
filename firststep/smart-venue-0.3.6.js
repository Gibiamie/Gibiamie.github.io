/* FirstStep Beta 0.3.6 smart venue patch: lower user burden, autocomplete, GPS fallback. */
(function(){
  if (typeof state === 'undefined') return;
  const repoLang = () => state.lang || 'tr';
  const txt = {
    tr: {
      beta: 'FIRSTSTEP BETA 0.3.6',
      smartHelp: 'Mekân adını ve konumu yazın. Uygulama türü açık veriyle bulmaya çalışır; türü yalnızca yanlışsa siz düzeltirsiniz.',
      findVenue: 'Mekânı bul ve türü otomatik belirle',
      searching: 'Açık veri kaynaklarında aranıyor…',
      chooseMatch: 'Bulunan eşleşmeler',
      noMatch: 'Açık veride güvenilir eşleşme bulunamadı. Daha net yazın veya türü manuel düzeltin.',
      selected: 'Eşleşme seçildi',
      verified: 'Açık veriden bulundu',
      inferred: 'Tür tahmini',
      lowConfidence: 'Düşük güven',
      correctType: 'Tür yanlışsa düzelt',
      hideCorrection: 'Düzeltmeyi kapat',
      create: 'Bağlamı oluştur',
      needVenue: 'Mekân adı veya konum girin. Tür seçmek ilk adım değildir.',
      needLookup: 'Önce mekânı bulmayı deneyin. Bulunamazsa türü manuel düzeltin.',
      gpsOkNoPoi: 'Konum alındı; fakat yakındaki mekân listesi açık veriden alınamadı. Mekân adını yazın, otomatik arayalım.',
      gpsNoPoi: 'Konum alındı; yakında güvenilir mekân bulunamadı. Mekân adını yazın.',
      gpsFail: 'Konum alınamadı. Tarayıcı izni, VPN veya bağlantı engelliyor olabilir. Manuel giriş kullanın.',
      generalContext: 'Bu bölüm gerçek müşteri profili değildir. Açık veride bulunan tür, konum ve saate göre sınırlı ortam varsayımıdır.'
    },
    en: {
      beta: 'FIRSTSTEP BETA 0.3.6',
      smartHelp: 'Enter the venue name and location. The app tries to identify the type from open data; correct the type only if it is wrong.',
      findVenue: 'Find venue and auto-detect type',
      searching: 'Searching open data sources…',
      chooseMatch: 'Possible matches',
      noMatch: 'No reliable open-data match was found. Type more clearly or correct the type manually.',
      selected: 'Match selected',
      verified: 'Found from open data',
      inferred: 'Type estimate',
      lowConfidence: 'Low confidence',
      correctType: 'Correct type if wrong',
      hideCorrection: 'Hide correction',
      create: 'Create context',
      needVenue: 'Enter a venue name or location. Selecting type is not the first step.',
      needLookup: 'Try finding the venue first. If not found, correct the type manually.',
      gpsOkNoPoi: 'Location was obtained, but nearby venues could not be loaded from open data. Type the venue name and search.',
      gpsNoPoi: 'Location was obtained; no reliable nearby venue was found. Type the venue name.',
      gpsFail: 'Location could not be obtained. Browser permission, VPN or connection may be blocking it. Use manual entry.',
      generalContext: 'This is not a real customer profile. It is a limited setting assumption based on open-data type, location and time.'
    }
  };
  const s = (k) => txt[repoLang()]?.[k] || txt.tr[k] || k;

  state.venue.lookupResults = state.venue.lookupResults || [];
  state.venue.lookupStatus = state.venue.lookupStatus || '';
  state.venue.showTypeCorrection = state.venue.showTypeCorrection || false;
  state.venue.verifiedSource = state.venue.verifiedSource || '';
  state.venue.typeConfidence = state.venue.typeConfidence || '';

  const oldTypeLabel = labelForVenueType;
  function inferTypeFromNominatim(item){
    const cls = item.class || '';
    const type = item.type || '';
    const ex = item.extratags || {};
    const categoryText = [cls, type, ex.amenity, ex.leisure, ex.tourism, ex.shop, ex.cuisine, item.display_name].filter(Boolean).join(' ').toLowerCase();
    if (/bar|nightclub|cocktail/.test(categoryText)) return 'bar';
    if (/pub|biergarten/.test(categoryText)) return 'pub';
    if (/cafe|coffee|cafeteria/.test(categoryText)) return 'cafe';
    if (/restaurant|food_court|fast_food|diner|grill|steak|pizza|sushi|burger/.test(categoryText)) return 'restaurant';
    if (/mall|shopping|shop|supermarket|department_store/.test(categoryText)) return 'mall';
    if (/park|beach|garden|recreation/.test(categoryText)) return 'park';
    if (/bus_station|station|airport|terminal|transport|ferry/.test(categoryText)) return 'transport';
    if (/theatre|cinema|events_venue|arts_centre|conference|stadium|arena/.test(categoryText)) return 'event';
    return 'other';
  }

  function compactAddress(item){
    const a = item.address || {};
    return [a.suburb || a.neighbourhood || a.city_district, a.city || a.town || a.village || a.state, a.country]
      .filter(Boolean).filter((v,i,arr)=>arr.indexOf(v)===i).join(', ') || item.display_name || '';
  }

  async function smartVenueSearch(){
    const name = document.getElementById('venueName')?.value.trim() || state.venue.name.trim();
    const loc = document.getElementById('locationText')?.value.trim() || state.venue.location.trim();
    state.venue.name = name; state.venue.location = loc;
    if ((name + loc).trim().length < 3) { toast(s('needVenue')); return; }
    state.venue.lookupStatus = s('searching');
    state.venue.lookupResults = [];
    state.venue.contextCreated = false;
    render();
    try {
      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('format','jsonv2');
      url.searchParams.set('addressdetails','1');
      url.searchParams.set('extratags','1');
      url.searchParams.set('namedetails','1');
      url.searchParams.set('limit','8');
      url.searchParams.set('accept-language', repoLang());
      url.searchParams.set('q', [name, loc].filter(Boolean).join(', '));
      const response = await fetch(url, { headers:{ Accept:'application/json' }});
      if (!response.ok) throw new Error('nominatim');
      const raw = await response.json();
      const results = raw.map((item, index)=>{
        const type = inferTypeFromNominatim(item);
        return {
          id: item.place_id || index,
          name: item.name || item.namedetails?.name || name || item.display_name?.split(',')[0] || 'Venue',
          type,
          location: compactAddress(item),
          display: item.display_name,
          lat: Number(item.lat), lon: Number(item.lon),
          confidence: type === 'other' ? 'low' : 'medium',
          source: 'Nominatim / OpenStreetMap'
        };
      }).filter(x=>x.name && x.location);
      state.venue.lookupResults = results;
      state.venue.lookupStatus = results.length ? s('chooseMatch') : s('noMatch');
      if (results.length === 1) applySmartPlace(results[0], false);
      render();
    } catch(error) {
      console.warn(error);
      state.venue.lookupStatus = s('noMatch');
      state.venue.lookupResults = [];
      render();
    }
  }

  function applySmartPlace(place, shouldToast=true){
    state.venue.selected = place;
    state.venue.name = place.name;
    state.venue.location = place.location;
    state.venue.type = place.type || 'other';
    state.venue.lat = place.lat || null;
    state.venue.lon = place.lon || null;
    state.venue.verifiedSource = place.source || 'OpenStreetMap';
    state.venue.typeConfidence = place.confidence || 'medium';
    state.venue.showTypeCorrection = false;
    state.venue.contextCreated = false;
    state.venue.resultCreated = false;
    if (shouldToast) toast(s('selected'));
  }

  window.renderVenue = function renderVenue(){
    const v = state.venue;
    const typeChips = venueTypes.map((type) => chip(type, oldTypeLabel(type, state.lang), v.type === type, 'venue-type')).join('');
    const typeSummary = v.type ? `<div class="lookup-status"><span class="verified-pill">${v.verifiedSource ? s('verified') : s('inferred')}</span> &nbsp; ${escapeHtml(oldTypeLabel(v.type, state.lang))}${v.typeConfidence === 'low' ? ' · ' + s('lowConfidence') : ''}</div>` : '';
    const lookup = (v.lookupStatus || v.lookupResults.length) ? `<section class="panel compact"><h2>${escapeHtml(v.lookupStatus || s('chooseMatch'))}</h2><div class="lookup-box">${v.lookupResults.map((p,i)=>`<button class="place-item" data-smart-place="${i}"><span><strong>${escapeHtml(p.name)}</strong><small>${escapeHtml(p.location)}<br><mark>${escapeHtml(oldTypeLabel(p.type, state.lang))}</mark> · ${escapeHtml(p.source || 'OpenStreetMap')}</small></span><span>${icon('arrow')}</span></button>`).join('')}</div></section>` : '';
    const correction = v.showTypeCorrection ? `<div class="correction-panel"><h2>${s('correctType')}</h2><div class="chip-row wrap">${typeChips}</div></div>` : '';
    const context = v.contextCreated ? renderVenueContext() : '';
    return `${header(t('venueTitle'), s('smartHelp'))}
      <section class="panel">
        <div class="field-grid">
          <label class="field"><span>${t('venueName')}</span><input id="venueName" value="${escapeHtml(v.name || '')}" placeholder="Tradervicks / White Rock Beach" autocomplete="off" /></label>
          <label class="field"><span>${t('location')}</span><input id="locationText" value="${escapeHtml(v.location || '')}" placeholder="Muscat, Oman" autocomplete="off" /></label>
        </div>
        <div class="venue-primary-actions">
          <button class="primary-button" data-action="smart-search">${s('findVenue')}</button>
          <button class="secondary-button" data-action="locate">${icon('gps')} ${t('locate')}</button>
        </div>
        <div class="inline-actions">
          <button class="secondary-button" data-action="voice-name">${icon('mic')} ${t('voiceVenue')}</button>
          <button class="secondary-button" data-action="voice-location">${icon('mic')} ${t('voiceLocation')}</button>
        </div>
        ${typeSummary}
        <button class="secondary-button full" data-action="toggle-type-correction">${v.showTypeCorrection ? s('hideCorrection') : s('correctType')}</button>
        ${correction}
        <p class="source-note">${t('openSource')}</p>
      </section>
      ${lookup}
      <section class="panel"><button class="primary-button full" data-action="create-context">${s('create')}</button><p class="source-note">${s('generalContext')}</p></section>
      ${context}`;
  };

  const oldContext = window.createVenueContext || createVenueContext;
  window.createVenueContext = function createVenueContext(){
    const name = document.getElementById('venueName')?.value.trim() || state.venue.name.trim();
    const loc = document.getElementById('locationText')?.value.trim() || state.venue.location.trim();
    state.venue.name = name; state.venue.location = loc;
    if (!name && !loc) return toast(s('needVenue'));
    if (!state.venue.type) return smartVenueSearch();
    state.venue.contextCreated = true;
    state.venue.resultCreated = false;
    render();
  };

  window.locateAndSearch = async function locateAndSearch(){
    if (!navigator.geolocation) return toast(s('gpsFail'));
    toast(t('locating'));
    navigator.geolocation.getCurrentPosition(async (position)=>{
      const { latitude, longitude } = position.coords;
      state.venue.lat = latitude; state.venue.lon = longitude;
      let gotLocation = false;
      try { state.venue.location = await reverseGeocode(latitude, longitude); gotLocation = true; }
      catch(e){ console.warn('reverse failed', e); }
      try {
        const nearby = await findNearbyVenues(latitude, longitude);
        state.venue.nearby = nearby;
        state.venue.lookupResults = nearby.map(p=>({ ...p, location: state.venue.location, confidence:'medium', source:'Overpass / OpenStreetMap' }));
        state.venue.lookupStatus = nearby.length ? s('chooseMatch') : s('gpsNoPoi');
      } catch(e){
        console.warn('nearby failed', e);
        state.venue.lookupResults = [];
        state.venue.lookupStatus = gotLocation ? s('gpsOkNoPoi') : s('gpsFail');
      }
      render();
    }, ()=>{ toast(s('gpsFail')); }, { enableHighAccuracy:true, timeout:15000, maximumAge:60000 });
  };

  const oldBind = bindPageEvents;
  window.bindPageEvents = function bindPageEvents(){
    oldBind();
    document.querySelector('[data-action="smart-search"]')?.addEventListener('click', smartVenueSearch);
    document.querySelector('[data-action="toggle-type-correction"]')?.addEventListener('click', ()=>{ state.venue.showTypeCorrection = !state.venue.showTypeCorrection; render(); });
    document.querySelectorAll('[data-smart-place]').forEach(el=>el.addEventListener('click', ()=>{ applySmartPlace(state.venue.lookupResults[Number(el.dataset.smartPlace)]); render(); }));
    let timer;
    ['venueName','locationText'].forEach(id=>{
      document.getElementById(id)?.addEventListener('input', (e)=>{
        if (id==='venueName') state.venue.name = e.target.value;
        if (id==='locationText') state.venue.location = e.target.value;
        clearTimeout(timer);
        const q = `${state.venue.name} ${state.venue.location}`.trim();
        if (q.length >= 4) timer = setTimeout(smartVenueSearch, 850);
      });
    });
  };

  const oldRenderVenueContext = renderVenueContext;
  window.renderVenueContext = function renderVenueContext(){
    const html = oldRenderVenueContext();
    return html.replace(t('probabilityNotice'), s('generalContext'));
  };

  render();
})();
