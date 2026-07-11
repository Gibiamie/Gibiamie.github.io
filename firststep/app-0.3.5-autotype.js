/* FirstStep Beta 0.3.5: venue-first logic repair.
   Purpose: venue name + location should resolve venue type automatically. Manual type selection is fallback only. */
(function FirstStepVenueLogicRepair(){
  const wait = setInterval(() => {
    try {
      if (typeof state === 'undefined' || typeof render === 'undefined' || typeof t === 'undefined') return;
      clearInterval(wait);
      installVenueAutoDetect();
    } catch (e) { console.warn('FirstStep 0.3.5 wait error', e); }
  }, 80);

  function label(key){
    const lang = state.lang || 'tr';
    const tr = {
      autoResolve: 'Mekânı otomatik çözümle',
      resolving: 'Mekân açık veride aranıyor…',
      autoType: 'Otomatik tür',
      confidence: 'Güven',
      source: 'Kaynak',
      verified: 'Açık veri eşleşmesi',
      notVerified: 'Açık veri eşleşmesi bulunamadı',
      lowNote: 'Bu mekânı açık veri kaynaklarında doğrulayamadım. Genel sonuç üretmek yerine türü hızlıca seçmeniz gerekir; bu artık zorunlu ilk adım değil, yalnızca doğrulama başarısız olduğunda kullanılan yedektir.',
      dataNote: 'Mekân adı ve konum açık veri kaynaklarında aranır. Tür bulunursa kullanıcıdan ayrıca tür seçmesi istenmez.',
      fallbackTitle: 'Eşleşme bulunamadıysa hızlı düzeltme',
      noAuto: 'Mekân adı + konumla açık veride yeterli eşleşme bulunamadı.',
      exactNotKnown: 'Bu bölüm gerçek müşteri profili değildir; bulunan mekân türü, açık veri etiketleri ve zaman bilgisinden üretilen sınırlı bağlamdır.',
      chooseDifferent: 'Bulunan tür yanlışsa düzeltin',
      resolveError: 'Mekân açık veride çözümlenemedi. Konumu kullanın veya manuel düzeltme yapın.',
      resolvedToast: 'Mekân türü otomatik bulundu',
      genericToast: 'Açık veri eşleşmedi; manuel tür yedeği açıldı'
    };
    const en = {
      autoResolve: 'Auto-detect venue',
      resolving: 'Searching open data…',
      autoType: 'Detected type',
      confidence: 'Confidence',
      source: 'Source',
      verified: 'Open-data match',
      notVerified: 'No open-data match found',
      lowNote: 'I could not verify this venue from open data. Instead of generating a generic result, choose a quick fallback type. This is no longer the first required step; it is only used when verification fails.',
      dataNote: 'The app searches open data with venue name and location. If the type is found, it does not ask you to select it manually.',
      fallbackTitle: 'Quick correction if no match is found',
      noAuto: 'No reliable open-data match was found from venue name + location.',
      exactNotKnown: 'This is not a real customer profile; it is limited context from detected venue type, open-data tags and time.',
      chooseDifferent: 'Correct detected type if it is wrong',
      resolveError: 'The venue could not be resolved from open data. Use location or manual correction.',
      resolvedToast: 'Venue type detected automatically',
      genericToast: 'Open data did not match; fallback type is available'
    };
    return (lang === 'en' ? en : tr)[key] || key;
  }

  function installVenueAutoDetect(){
    if (!state.venue.resolve) {
      state.venue.resolve = { status: 'idle', confidence: null, source: null, displayName: '', rawType: '', fallbackNeeded: false };
    }

    const oldCreateVenueContext = createVenueContext;

    createVenueContext = async function createVenueContextAuto(){
      const name = document.querySelector('#venueName')?.value.trim() || state.venue.name.trim();
      const location = document.querySelector('#locationText')?.value.trim() || state.venue.location.trim();
      state.venue.name = name;
      state.venue.location = location;
      state.venue.contextCreated = false;
      state.venue.resultCreated = false;
      state.venue.resolve = { status: 'resolving', confidence: null, source: null, displayName: '', rawType: '', fallbackNeeded: false };
      render();
      if (!name && !location) {
        toast(t('nameOrLocationRequired'));
        state.venue.resolve = { status: 'idle', confidence: null, source: null, displayName: '', rawType: '', fallbackNeeded: false };
        render();
        return;
      }

      try {
        const resolved = await resolveVenueFromOpenData(name, location, state.lang);
        if (resolved && resolved.type && resolved.type !== 'other') {
          state.venue.type = resolved.type;
          state.venue.name = resolved.displayName || name;
          state.venue.location = resolved.location || location;
          state.venue.lat = resolved.lat || state.venue.lat;
          state.venue.lon = resolved.lon || state.venue.lon;
          state.venue.resolve = {
            status: 'verified',
            confidence: resolved.confidence || 'medium',
            source: resolved.source || 'OpenStreetMap / Nominatim',
            displayName: resolved.displayName || name,
            rawType: resolved.rawType || resolved.type,
            fallbackNeeded: false
          };
          state.venue.contextCreated = true;
          toast(label('resolvedToast'));
        } else {
          state.venue.type = state.venue.type || '';
          state.venue.resolve = {
            status: 'not_found',
            confidence: 'low',
            source: 'OpenStreetMap / Nominatim',
            displayName: name,
            rawType: '',
            fallbackNeeded: true
          };
          state.venue.contextCreated = Boolean(state.venue.type);
          toast(label('genericToast'));
        }
      } catch (e) {
        console.warn('Venue auto-detect failed', e);
        state.venue.resolve = { status: 'error', confidence: 'low', source: 'OpenStreetMap / Nominatim', displayName: name, rawType: '', fallbackNeeded: true };
        state.venue.contextCreated = Boolean(state.venue.type);
        toast(label('resolveError'));
      }
      render();
    };

    renderVenue = function renderVenueAuto(){
      const v = state.venue;
      const r = v.resolve || { status: 'idle' };
      const resolving = r.status === 'resolving';
      const showFallback = r.fallbackNeeded || r.status === 'not_found' || r.status === 'error';
      const showDetected = r.status === 'verified';
      const typeChips = venueTypes.map((type) => chip(type, labelForVenueType(type, state.lang), v.type === type, 'venue-type')).join('');
      const nearby = v.nearby.length ? `<section class="panel">
        <h2>${t('nearby')}</h2>
        <div class="place-list">
          ${v.nearby.map((place, index) => `<button class="place-item ${v.selected?.id === place.id ? 'selected' : ''}" data-place-index="${index}">
            <span><strong>${escapeHtml(place.name)}</strong><small>${escapeHtml(labelForVenueType(place.type, state.lang))}${place.distance ? ` · ${place.distance} m` : ''}</small></span>
            <span>${icon('arrow')}</span>
          </button>`).join('')}
          <button class="place-item manual" data-action="manual-place"><span><strong>${t('noNearby')}</strong></span><span>${icon('arrow')}</span></button>
        </div>
      </section>` : '';

      const detectedPanel = showDetected ? `<section class="panel compact">
        <div class="section-title-row"><h2>${label('verified')}</h2><span>${labelForVenueType(v.type, state.lang)}</span></div>
        <p><strong>${label('autoType')}:</strong> ${escapeHtml(labelForVenueType(v.type, state.lang))}</p>
        <p><strong>${label('confidence')}:</strong> ${escapeHtml(r.confidence || 'medium')} · <strong>${label('source')}:</strong> ${escapeHtml(r.source || 'OpenStreetMap')}</p>
        <p class="source-note">${label('exactNotKnown')}</p>
        <h3>${label('chooseDifferent')}</h3>
        <div class="chip-row wrap">${typeChips}</div>
        <button class="primary-button full" data-action="create-context">${label('autoResolve')}</button>
      </section>` : '';

      const fallbackPanel = showFallback ? `<section class="panel compact">
        <div class="section-title-row"><h2>${label('fallbackTitle')}</h2><span>${label('notVerified')}</span></div>
        <p>${r.status === 'error' ? label('resolveError') : label('noAuto')}</p>
        <p class="source-note">${label('lowNote')}</p>
        <div class="chip-row wrap">${typeChips}</div>
        ${v.type ? `<button class="primary-button full" data-action="force-context">${t('createContext')}</button>` : ''}
      </section>` : '';

      return `${header(t('venueTitle'), t('venueHelp'))}
        <section class="panel">
          <div class="field-grid">
            <label class="field"><span>${t('venueName')}</span><input id="venueName" value="${escapeHtml(v.name)}" placeholder="${escapeHtml(t('venuePlaceholder'))}" autocomplete="organization" /></label>
            <label class="field"><span>${t('location')}</span><input id="locationText" value="${escapeHtml(v.location)}" placeholder="${escapeHtml(t('locationPlaceholder'))}" autocomplete="address-level2" /></label>
          </div>
          <div class="inline-actions three">
            <button class="secondary-button" data-action="voice-name">${icon('mic')} ${t('voiceVenue')}</button>
            <button class="secondary-button" data-action="voice-location">${icon('mic')} ${t('voiceLocation')}</button>
            <button class="primary-button" data-action="locate">${icon('gps')} ${t('locate')}</button>
          </div>
          <button class="primary-button full" data-action="create-context" ${resolving ? 'disabled' : ''}>${resolving ? label('resolving') : label('autoResolve')}</button>
          <p class="source-note">${label('dataNote')}</p>
        </section>
        ${nearby}
        ${detectedPanel}
        ${fallbackPanel}
        ${v.contextCreated ? renderVenueContext() : ''}`;
    };

    const oldRenderVenueContext = renderVenueContext;
    renderVenueContext = function renderVenueContextAuto(){
      const html = oldRenderVenueContext();
      const note = `<section class="panel compact"><p class="source-note">${label('exactNotKnown')}</p></section>`;
      return note + html;
    };

    const oldBindPageEvents = bindPageEvents;
    bindPageEvents = function bindPageEventsAuto(){
      oldBindPageEvents();
      document.querySelector('[data-action="force-context"]')?.addEventListener('click', () => {
        if (!state.venue.type) return toast(t('typeRequired'));
        state.venue.contextCreated = true;
        state.venue.resultCreated = false;
        render();
      });
    };

    // Make selected place immediately create context with its detected OSM type.
    const oldSelectPlace = selectPlace;
    selectPlace = function selectPlaceAuto(index){
      oldSelectPlace(index);
      const place = state.venue.selected;
      if (place) {
        state.venue.resolve = {
          status: 'verified', confidence: 'high', source: 'OpenStreetMap / Overpass',
          displayName: place.name, rawType: place.type, fallbackNeeded: false
        };
        state.venue.contextCreated = true;
        state.venue.resultCreated = false;
        render();
      }
    };

    // Preserve old manual function just in case.
    createVenueContext.manualLegacy = oldCreateVenueContext;
    render();
  }

  async function resolveVenueFromOpenData(name, location, lang){
    const q = [name, location].filter(Boolean).join(', ');
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('extratags', '1');
    url.searchParams.set('namedetails', '1');
    url.searchParams.set('limit', '6');
    url.searchParams.set('accept-language', lang || 'tr');
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('nominatim search failed');
    const items = await res.json();
    if (!Array.isArray(items) || !items.length) return null;

    const scored = items.map((item) => {
      const detected = detectType(item, name);
      const importance = Number(item.importance || 0);
      const exactName = normalize(item.name || item.display_name || '').includes(normalize(name));
      const score = (detected.type !== 'other' ? 50 : 0) + (exactName ? 25 : 0) + Math.round(importance * 20);
      return { item, detected, score };
    }).sort((a,b) => b.score - a.score);

    const best = scored[0];
    if (!best || best.detected.type === 'other' || best.score < 45) return null;
    const a = best.item.address || {};
    const loc = [a.suburb || a.neighbourhood || a.city_district, a.city || a.town || a.village || a.state, a.country].filter(Boolean).filter((v,i,arr)=>arr.indexOf(v)===i).join(', ');
    return {
      type: best.detected.type,
      rawType: best.detected.raw,
      confidence: best.score > 75 ? 'high' : 'medium',
      source: 'OpenStreetMap / Nominatim',
      displayName: best.item.name || name,
      location: loc || location,
      lat: best.item.lat ? Number(best.item.lat) : null,
      lon: best.item.lon ? Number(best.item.lon) : null
    };
  }

  function detectType(item, name){
    const ex = item.extratags || {};
    const category = String(item.category || '').toLowerCase();
    const type = String(item.type || '').toLowerCase();
    const cls = String(item.class || '').toLowerCase();
    const amenity = String(ex.amenity || '').toLowerCase();
    const shop = String(ex.shop || '').toLowerCase();
    const leisure = String(ex.leisure || '').toLowerCase();
    const tourism = String(ex.tourism || '').toLowerCase();
    const text = [name, item.name, item.display_name, category, type, cls, amenity, shop, leisure, tourism].join(' ').toLowerCase();
    const raw = [category, type, amenity, shop, leisure, tourism].filter(Boolean).join('/');
    if (/\b(cafe|coffee|espresso|kahve|coffee_shop)\b/.test(text) || amenity === 'cafe') return { type: 'cafe', raw };
    if (/\b(pub|biergarten)\b/.test(text) || amenity === 'pub' || amenity === 'biergarten') return { type: 'pub', raw };
    if (/\b(bar|nightclub|cocktail|lounge)\b/.test(text) || amenity === 'bar' || amenity === 'nightclub') return { type: 'bar', raw };
    if (/\b(restaurant|restoran|diner|grill|steak|sushi|pizza|burger|fast_food|food_court)\b/.test(text) || ['restaurant','fast_food','food_court'].includes(amenity)) return { type: 'restaurant', raw };
    if (/\b(theatre|cinema|event|conference|concert|music_venue)\b/.test(text) || ['theatre','cinema','music_venue'].includes(amenity)) return { type: 'event', raw };
    if (/\b(park|garden|playground)\b/.test(text) || ['park','garden'].includes(leisure)) return { type: 'park', raw };
    if (/\b(mall|shopping|shop|store)\b/.test(text) || shop) return { type: 'mall', raw };
    if (/\b(station|airport|bus|tram|metro|ferry|terminal)\b/.test(text) || ['station','bus_station','ferry_terminal'].includes(amenity)) return { type: 'transport', raw };
    return { type: 'other', raw };
  }

  function normalize(s){ return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }
})();
