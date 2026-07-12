import { classifyVenue, CATEGORY_LABEL } from './classify.js?v=3.0.1';
import { getSentence, INTENT, INTENT_LABEL } from './sentences.js?v=3.0.1';
import {
  getPosition,
  searchNearby,
  searchGlobal,
  reverseGeocode,
  formatDistance,
  RADIUS_NEAR,
  RADIUS_WIDE,
} from './search.js?v=3.0.1';

const els = {
  q: document.getElementById('q'),
  clear: document.getElementById('clear'),
  voice: document.getElementById('voice'),
  loc: document.getElementById('loc'),
  status: document.getElementById('status'),
  results: document.getElementById('results'),
  selected: document.getElementById('selected'),
  intent: document.getElementById('intent'),
  answer: document.getElementById('answer'),
  net: document.getElementById('net'),
  startTab: document.getElementById('startTab'),
  privacyTab: document.getElementById('privacyTab'),
  privacy: document.getElementById('privacy'),
  start: document.getElementById('start'),
};

const CONFIDENCE_LABEL = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };

const state = {
  position: null,
  lastQuery: '',
  radiusStage: null, // 'near' | 'wide' | null
  searchToken: 0,
  selectedVenue: null,
  currentIntent: INTENT.APPROACH,
  lastSentence: null,
  debounceTimer: null,
  locationPromise: null,
};

function setStatus(text) {
  els.status.textContent = text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Requests geolocation at most once and shares the in-flight/resolved
 * promise across callers (auto-attempt on load, typing, and the explicit
 * button), so typing alone can benefit from location without requiring
 * the user to tap "Konumumu kullan" first.
 */
function getPositionOnce() {
  if (state.position) return Promise.resolve(state.position);
  if (!state.locationPromise) {
    state.locationPromise = getPosition()
      .then((pos) => {
        state.position = pos;
        els.loc.textContent = '📍 Konum aktif';
        return pos;
      })
      .catch((err) => {
        state.locationPromise = null;
        throw err;
      });
  }
  return state.locationPromise;
}

function clearResults() {
  els.results.innerHTML = '';
}

function typeBadgeFor(tags, name) {
  const { category } = classifyVenue(tags, name);
  return CATEGORY_LABEL[category];
}

function renderResultsList(venues, opts = {}) {
  clearResults();
  if (!venues.length) return;
  const list = document.createElement('div');
  list.className = 'result-list';
  for (const v of venues) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'result-item';
    const dist = v.distance != null ? formatDistance(v.distance) : null;
    item.innerHTML = `
      <span class="result-main">
        <span class="result-name">${escapeHtml(v.name)}</span>
        <span class="result-meta">${escapeHtml(typeBadgeFor(v.tags, v.name))}${dist ? ' · ' + dist : ''}</span>
      </span>
      <span class="result-arrow">›</span>
    `;
    item.addEventListener('click', () => selectVenue(v));
    list.appendChild(item);
  }
  els.results.appendChild(list);

  if (opts.expandButton) {
    els.results.appendChild(opts.expandButton);
  }
  if (opts.globalButton) {
    els.results.appendChild(opts.globalButton);
  }
}

function renderMessage(text, actions = []) {
  clearResults();
  const box = document.createElement('div');
  box.className = 'search-message';
  const p = document.createElement('p');
  p.textContent = text;
  box.appendChild(p);
  for (const action of actions) {
    box.appendChild(action);
  }
  els.results.appendChild(box);
}

function makeActionButton(label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ghost small';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function runLocalSearch(query, radius, myToken) {
  const venues = await searchNearby(state.position, radius, query);
  if (myToken !== state.searchToken) return; // stale response, ignore

  if (venues.length) {
    state.radiusStage = radius === RADIUS_NEAR ? 'near' : 'wide';
    renderResultsList(venues.slice(0, 10));
    setStatus(
      radius === RADIUS_NEAR
        ? `${venues.length} sonuç, 500 m içinde.`
        : `${venues.length} sonuç, 3 km içinde.`
    );
    return;
  }

  if (radius === RADIUS_NEAR) {
    const expandBtn = makeActionButton('500 m içinde eşleşme yok. 3 km’ye kadar genişlet.', () => {
      const token = ++state.searchToken;
      setStatus('3 km içinde aranıyor…');
      runLocalSearch(query, RADIUS_WIDE, token).catch((err) => handleSearchError(err, token));
    });
    expandBtn.className = 'expand-btn';
    renderMessage('Yakında eşleşme bulunamadı.', [expandBtn]);
    setStatus('500 m içinde eşleşme yok.');
  } else {
    const globalBtn = makeActionButton('Yakında bulunamadı. Dünya genelinde ara.', () => {
      const token = ++state.searchToken;
      setStatus('Dünya genelinde aranıyor…');
      runGlobalSearch(query, token).catch((err) => handleSearchError(err, token));
    });
    globalBtn.className = 'expand-btn';
    renderMessage('3 km içinde de eşleşme bulunamadı.', [globalBtn]);
    setStatus('3 km içinde eşleşme yok.');
  }
}

async function runGlobalSearch(query, myToken) {
  const venues = await searchGlobal(query, state.position);
  if (myToken !== state.searchToken) return;
  if (venues.length) {
    renderResultsList(venues.slice(0, 10));
    setStatus(`${venues.length} küresel sonuç bulundu.`);
  } else {
    renderMessage('Hiçbir sonuç bulunamadı. Mekân adını kontrol edip tekrar deneyin.');
    setStatus('Sonuç yok.');
  }
}

function handleSearchError(err, myToken) {
  if (myToken !== state.searchToken) return;
  console.error(err);
  renderMessage('Arama sırasında bir sorun oluştu. Bağlantınızı kontrol edip tekrar deneyin.');
  setStatus('Arama başarısız.');
}

function onQueryInput() {
  const query = els.q.value;
  state.lastQuery = query;
  els.clear.classList.toggle('visible', query.length > 0);

  clearTimeout(state.debounceTimer);

  if (query.trim().length < 3) {
    clearResults();
    setStatus(
      state.position
        ? 'Hazır. Mekân adını yazmaya devam edin (en az 3 harf).'
        : 'Hazır. Mekânı yazın veya konumunuzu kullanın.'
    );
    return;
  }

  state.debounceTimer = setTimeout(async () => {
    const token = ++state.searchToken;

    // Give a just-triggered or already-in-flight location request a short
    // grace period, so typing right after opening the app still gets
    // local-first results instead of jumping straight to a global search.
    if (!state.position && state.locationPromise) {
      setStatus('Konum kontrol ediliyor…');
      await Promise.race([state.locationPromise.catch(() => {}), sleep(4000)]);
      if (token !== state.searchToken) return;
    }

    if (state.position) {
      setStatus('500 m içinde aranıyor…');
      runLocalSearch(query, RADIUS_NEAR, token).catch((err) => handleSearchError(err, token));
    } else {
      setStatus('Konum yok, genel arama yapılıyor…');
      runGlobalSearch(query, token).catch((err) => handleSearchError(err, token));
    }
  }, 350);
}

async function selectVenue(venue) {
  clearResults();
  els.q.value = venue.name;
  els.clear.classList.add('visible');
  setStatus('Mekân seçildi.');

  const classification = classifyVenue(venue.tags, venue.name);
  let address = venue.address;
  if (!address) {
    address = await reverseGeocode(venue.lat, venue.lon).catch(() => '');
  }

  state.selectedVenue = {
    ...venue,
    address,
    category: classification.category,
    confidence: classification.confidence,
  };
  state.currentIntent = INTENT.APPROACH;
  state.lastSentence = null;

  renderSelectedCard();
  renderIntentButtons();
  renderAnswer();

  els.selected.classList.remove('hidden');
  els.intent.classList.remove('hidden');
  els.answer.classList.remove('hidden');
  els.selected.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSelectedCard() {
  const v = state.selectedVenue;
  const dist = v.distance != null ? formatDistance(v.distance) : null;
  els.selected.innerHTML = `
    <h2>${escapeHtml(v.name)}</h2>
    <dl class="venue-meta">
      ${v.address ? `<div><dt>Adres</dt><dd>${escapeHtml(v.address)}</dd></div>` : ''}
      ${dist ? `<div><dt>Mesafe</dt><dd>${dist}</dd></div>` : ''}
      <div><dt>Tür</dt><dd>${escapeHtml(CATEGORY_LABEL[v.category])}</dd></div>
      <div><dt>Güven</dt><dd class="conf conf-${v.confidence}">${CONFIDENCE_LABEL[v.confidence]}</dd></div>
      <div><dt>Kaynak</dt><dd>${escapeHtml(v.source)}</dd></div>
    </dl>
  `;
}

function renderIntentButtons() {
  els.intent.innerHTML = '<h3>Ne oluyor?</h3>';
  const grid = document.createElement('div');
  grid.className = 'intent-grid';
  for (const key of Object.values(INTENT)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'intent-btn' + (key === state.currentIntent ? ' active' : '');
    btn.textContent = INTENT_LABEL[key];
    btn.addEventListener('click', () => {
      state.currentIntent = key;
      state.lastSentence = null;
      renderIntentButtons();
      renderAnswer();
    });
    grid.appendChild(btn);
  }
  els.intent.appendChild(grid);
}

function renderAnswer() {
  const v = state.selectedVenue;
  const sentence = getSentence(v.category, state.currentIntent, state.lastSentence);
  state.lastSentence = sentence;
  els.answer.innerHTML = `
    <p class="sentence">${escapeHtml(sentence)}</p>
    <button type="button" id="another" class="ghost">Başka öneri</button>
  `;
  document.getElementById('another').addEventListener('click', () => {
    const next = getSentence(v.category, state.currentIntent, state.lastSentence);
    state.lastSentence = next;
    els.answer.querySelector('.sentence').textContent = next;
  });
}

async function useMyLocation() {
  setStatus('Konum isteniyor…');
  els.loc.disabled = true;
  try {
    await getPositionOnce();
    setStatus('Konum alındı. Yakındaki mekânlar aranıyor…');
    const token = ++state.searchToken;
    await runLocalSearch(els.q.value, RADIUS_NEAR, token);
    if (!els.results.querySelector('.result-list')) {
      setStatus('Yakında mekân bulunamadı. Bulunduğunuz mekânın adını yazabilirsiniz.');
    }
  } catch (err) {
    console.error(err);
    if (err && err.code === 1) {
      setStatus('Konum izni verilmedi. Mekân adını yazarak devam edebilirsiniz.');
    } else {
      setStatus('Konum alınamadı. Mekân adını yazarak devam edebilirsiniz.');
    }
  } finally {
    els.loc.disabled = false;
  }
}

function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    els.voice.remove();
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'tr-TR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  els.voice.addEventListener('click', () => {
    setStatus('Dinleniyor…');
    try {
      recognition.start();
    } catch {
      /* already started */
    }
  });
  recognition.addEventListener('result', (event) => {
    const text = event.results[0][0].transcript;
    els.q.value = text;
    onQueryInput();
  });
  recognition.addEventListener('error', () => {
    setStatus('Ses tanıma başarısız. Mekân adını yazabilirsiniz.');
  });
}

function resetToStart() {
  els.q.value = '';
  els.clear.classList.remove('visible');
  clearResults();
  els.selected.classList.add('hidden');
  els.intent.classList.add('hidden');
  els.answer.classList.add('hidden');
  els.privacy.classList.add('hidden');
  els.start.classList.remove('hidden');
  setStatus(
    state.position ? 'Hazır. Mekân adını yazmaya devam edin (en az 3 harf).' : 'Hazır. Mekânı yazın veya konumunuzu kullanın.'
  );
  els.q.focus();
}

function togglePrivacy() {
  const showing = !els.privacy.classList.contains('hidden');
  if (showing) {
    els.privacy.classList.add('hidden');
    els.start.classList.remove('hidden');
  } else {
    els.privacy.classList.remove('hidden');
    els.start.classList.add('hidden');
    els.selected.classList.add('hidden');
    els.intent.classList.add('hidden');
    els.answer.classList.add('hidden');
  }
}

function setupNetworkBadge() {
  const update = () => {
    els.net.textContent = navigator.onLine ? 'Çevrimiçi' : 'Çevrimdışı';
    els.net.classList.toggle('offline', !navigator.onLine);
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

function init() {
  els.q.addEventListener('input', onQueryInput);
  els.clear.addEventListener('click', () => {
    els.q.value = '';
    els.clear.classList.remove('visible');
    clearResults();
    setStatus(
      state.position ? 'Hazır. Mekân adını yazmaya devam edin (en az 3 harf).' : 'Hazır. Mekânı yazın veya konumunuzu kullanın.'
    );
    els.q.focus();
  });
  els.loc.addEventListener('click', useMyLocation);
  els.startTab.addEventListener('click', resetToStart);
  els.privacyTab.addEventListener('click', togglePrivacy);
  setupVoiceInput();
  setupNetworkBadge();

  // Ask for location as early as possible (silently) so that by the time
  // the user finishes typing 3 characters, local-first search is ready
  // without requiring an explicit "Konumumu kullan" tap first.
  getPositionOnce().catch(() => {});

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(() => {});
    });
  }
}

init();
