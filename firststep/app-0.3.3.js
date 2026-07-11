/* FirstStep Beta 0.3.3
   Fixes weak openers and repeated "Another option" output.
   No API key. No hidden recording. Open venue lookup uses public OSM endpoints only when requested. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const labels = {
    tr: {
      cafe: 'Kafe', restaurant: 'Restoran', bar: 'Bar', pub: 'Pub', event: 'Etkinlik', park: 'Park / açık alan', mall: 'AVM / mağaza', transport: 'Ulaşım / bekleme alanı', other: 'Diğer',
      single: 'Tek kişi', pair: 'İki kişi', group: 'Grup', ordering: 'Menü / sipariş', queue: 'Net bir sıra', live_music: 'Canlı müzik', event_anchor: 'Etkinlik / program', screen: 'Maç / ortak yayın', book: 'Kitap', venue_advice: 'Mekân tavsiyesi', no_anchor: 'Net ortak bağlam yok',
      order_service: 'Sipariş / hizmet', entrance: 'Giriş / kontrol', transport_q: 'Ulaşım', event_entry: 'Etkinlik girişi', open: 'Açık / rahat', neutral: 'Nötr', busy: 'Meşgul', closed: 'Yaklaşmak uygun değil'
    },
    en: {
      cafe: 'Café', restaurant: 'Restaurant', bar: 'Bar', pub: 'Pub', event: 'Event', park: 'Park / outdoor', mall: 'Mall / shop', transport: 'Transport / waiting area', other: 'Other',
      single: 'One person', pair: 'Two people', group: 'Group', ordering: 'Menu / ordering', queue: 'A specific queue', live_music: 'Live music', event_anchor: 'Event / programme', screen: 'Match / shared screen', book: 'Book', venue_advice: 'Venue advice', no_anchor: 'No clear shared context',
      order_service: 'Order / service', entrance: 'Entrance / check-in', transport_q: 'Transport', event_entry: 'Event entrance', open: 'Open / relaxed', neutral: 'Neutral', busy: 'Busy', closed: 'Not appropriate to approach'
    }
  };

  const ui = {
    tr: {
      tagline: 'Gerçek ortamda, doğru ilk adım.', online: 'Çevrimiçi', offline: 'Çevrimdışı',
      homeIntro: 'Uzun form değil; gerçek ortak bağlama dayalı kısa ve doğal başlangıçlar.',
      spontaneous: 'Spontane Başlat', spontaneousDesc: 'Şu anda gördüğünüz kişi veya grupla konuşmak için hızlı yardım.',
      venue: 'Mekândayım', venueDesc: 'Mekân, zaman ve gözleme göre daha bağlamsal öneri alın.',
      rescue: 'Hızlı Kurtarma', rescueDesc: 'Sessizlik, kısa cevap veya konu tükenmesi için tek dokunuşluk yardım.',
      practice: 'Pratik', practiceDesc: 'Kısa senaryolarla daha iyi başlangıçları ayırt edin.',
      privacyNote: 'Hesap yok. Gizli dinleme yok. Konuşmalar sunucuya gönderilmez.',
      back: 'Geri', favorites: 'Favoriler', privacy: 'Gizlilik', personQ: 'Kiminle konuşacaksınız?', anchorQ: 'Hangi gerçek ortak bağlam var?', queueQ: 'Sıra ne için?', sayNow: 'Şimdi söyle', noLine: 'Cümle üretmedim', another: 'Başka öneri', save: 'Favoriye ekle', saved: 'Favoriye eklendi', why: 'Neden bu daha iyi?', safe: 'Güvenlik notu',
      noContext: 'Net bir ortak bağlam yoksa uygulama uydurma cümle üretmez. Kısa bir selam için doğal bir an bekleyin.',
      venueTitle: 'Mekân bağlamı', venueHelp: 'Mekânı yazın veya konum izni vererek yakındaki açık veri kaynaklı mekânları bulun.', venueName: 'Mekân adı', location: 'Şehir / semt / ülke', venuePlaceholder: 'Örn. The Beach House', locationPlaceholder: 'Örn. Muscat, Oman', voiceVenue: 'Mekânı söyle', voiceLocation: 'Konumu söyle', locate: 'Konumumu kullan', venueType: 'Mekân türü', createContext: 'Bağlamı oluştur', generate: 'Öneriyi oluştur', nearby: 'Yakındaki mekânlar', noNearby: 'Mekân listede yok / manuel gireceğim',
      target: 'Konuşulacak kişi/grup', activity: 'Ne yapıyor?', openness: 'Yaklaşılabilirlik', eating: 'Yiyor / içiyor', reading: 'Kitap okuyor', phone: 'Telefonla ilgileniyor', ordering_act: 'Sipariş seçiyor', liveMusic: 'Canlı müzik dinliyor', screenAct: 'Maç / yayın izliyor', sharedEvent: 'Etkinlikte', groupTalking: 'Grubuyla konuşuyor',
      contextReady: 'Mekân bağlamı hazır', likely: 'Muhtemel sosyal bağlamlar', probability: 'Bunlar gerçek kişiler hakkında kesin profil değildir; mekân türü ve zamana dayalı olasılıksal bağlamdır.', assessment: 'Durumsal değerlendirme', mainSuggestion: 'Önerilen ilk cümle', topics: 'Doğal konu yolları',
      rescueTitle: 'Şu anda ne oldu?', rescueSubtitle: 'Karşı tarafın tam cümlesini yazmayın. Sadece durumu seçin.', silence: 'Sessizlik oldu', short_answer: 'Kısa cevap verdi', asks_question: 'Bana soru sordu', topic_ended: 'Konu bitti', interested: 'İlgili görünüyor', leaving: 'Ayrılması gerekiyor', joined_group: 'Gruba biri katıldı', doThis: 'Şimdi bunu yapın', alternative: 'Alternatif',
      noFav: 'Henüz favori öneriniz yok.', clearFav: 'Favorileri temizle', privacyTitle: 'Gizlilik Merkezi', privacyBody: 'Bu beta önerileri cihazda üretir. GPS yalnızca siz düğmeye bastığınızda kullanılır. Konum ve kişi bilgileri kalıcı olarak saklanmaz.', clearAll: 'Tüm yerel verileri sil', cleared: 'Yerel veriler silindi.',
      geoError: 'Konum veya açık mekân verisi alınamadı. Manuel giriş kullanabilirsiniz.', noPlaces: 'Yakında uygun açık veri kaydı bulunamadı. Manuel giriş yapabilirsiniz.', typeRequired: 'Lütfen mekân türü seçin.', nameRequired: 'Mekân adı veya konum bilgisinden en az birini girin.', listening: 'Dinliyorum…', voiceUnsupported: 'Bu tarayıcı sesli girişi desteklemiyor.', installHint: 'Chrome menüsünden “Ana ekrana ekle” seçeneğini kullanabilirsiniz.'
    },
    en: {
      tagline: 'The right first step, in the real setting.', online: 'Online', offline: 'Offline',
      homeIntro: 'Not a long form; short, natural openers based on real shared context.',
      spontaneous: 'Start Spontaneously', spontaneousDesc: 'Fast help for someone or a group you just noticed.',
      venue: 'I’m at a Venue', venueDesc: 'Use venue, time and observation for more contextual suggestions.',
      rescue: 'Quick Rescue', rescueDesc: 'One-tap help for silence, short answers or a topic that ended.',
      practice: 'Practice', practiceDesc: 'Learn to distinguish stronger openers in short scenarios.',
      privacyNote: 'No account. No hidden listening. Conversations are not sent to a server.',
      back: 'Back', favorites: 'Favourites', privacy: 'Privacy', personQ: 'Who will you speak with?', anchorQ: 'What real shared context is available?', queueQ: 'What is the queue for?', sayNow: 'Say this now', noLine: 'No line generated', another: 'Another option', save: 'Save', saved: 'Saved', why: 'Why this is stronger', safe: 'Safety note',
      noContext: 'Without a clear shared context, the app will not invent a line. Wait for a natural moment for a brief greeting.',
      venueTitle: 'Venue context', venueHelp: 'Enter the venue or allow location access to find nearby open-data venues.', venueName: 'Venue name', location: 'City / district / country', venuePlaceholder: 'e.g. The Beach House', locationPlaceholder: 'e.g. Muscat, Oman', voiceVenue: 'Say venue', voiceLocation: 'Say location', locate: 'Use my location', venueType: 'Venue type', createContext: 'Create context', generate: 'Create suggestion', nearby: 'Nearby venues', noNearby: 'My venue is not listed / enter manually',
      target: 'Person/group', activity: 'What are they doing?', openness: 'Approachability', eating: 'Eating / drinking', reading: 'Reading', phone: 'Using phone', ordering_act: 'Choosing order', liveMusic: 'Listening to live music', screenAct: 'Watching match / broadcast', sharedEvent: 'At event', groupTalking: 'Talking with group',
      contextReady: 'Venue context ready', likely: 'Possible social contexts', probability: 'These are not definite profiles of real people; they are probabilistic contexts based on venue type and time.', assessment: 'Situational assessment', mainSuggestion: 'Recommended opener', topics: 'Natural topic paths',
      rescueTitle: 'What just happened?', rescueSubtitle: 'Do not type the exact sentence. Select only the situation.', silence: 'Silence', short_answer: 'Short answer', asks_question: 'They asked me something', topic_ended: 'Topic ended', interested: 'They seem interested', leaving: 'They need to leave', joined_group: 'Someone joined the group', doThis: 'Do this now', alternative: 'Alternative',
      noFav: 'You have no saved suggestions yet.', clearFav: 'Clear favourites', privacyTitle: 'Privacy Centre', privacyBody: 'This beta generates suggestions on the device. GPS is used only when you press the button. Location and person details are not stored permanently.', clearAll: 'Delete all local data', cleared: 'Local data deleted.',
      geoError: 'Location or open venue data could not be loaded. You can use manual entry.', noPlaces: 'No suitable open-data venue was found nearby. You can enter it manually.', typeRequired: 'Please select a venue type.', nameRequired: 'Enter at least venue name or location.', listening: 'Listening…', voiceUnsupported: 'Voice input is not supported by this browser.', installHint: 'Use “Add to Home Screen” from the Chrome menu.'
    }
  };

  const openers = {
    tr: {
      ordering: [
        { text: 'Merhaba, menüde kararsız kaldım. Burada gerçekten iyi dediğiniz bir şey var mı?', why: 'Kişiden kişisel bilgi istemez; sadece bulunduğunuz ortak duruma dayanır.' },
        { text: 'Merhaba, kısa bir fikir sorabilir miyim? Burada ilk kez seçiyormuş gibi baksanız ne alırdınız?', why: 'Cevap vermesi kolaydır ve sohbeti menü üzerinden doğal başlatır.' },
        { text: 'Merhaba, sipariş vermeden önce bir öneri alabilir miyim? Güvenli tercih hangisi olur?', why: 'Yardım istemek düşük baskılı ve sosyal olarak kabul edilebilir bir açılıştır.' },
        { text: 'Merhaba, sizce burada en risksiz seçim ne olur? Menü biraz kararsız bıraktı.', why: 'Hafif mizah içerir; karşı taraf isterse kısa cevapla çıkabilir.' },
        { text: 'Merhaba, rahatsız etmiyorsam bir menü tavsiyesi soracağım. Burada pişman etmeyen bir şey var mı?', why: 'Sınır koyar, naziktir ve cevap alanını net tutar.' }
      ],
      queue_order_service: [
        { text: 'Merhaba, yanlış sıraya girmeyeyim: sipariş için buradan mı devam ediyoruz?', why: 'Somut ve gerçek bir ihtiyaçtan başlar; anlamsız sohbet gibi durmaz.' },
        { text: 'Merhaba, bu sıra sipariş için mi, yoksa ödeme için mi biliyor musunuz?', why: 'Ortak belirsizliği kullanır ve konuşmayı doğal başlatır.' },
        { text: 'Merhaba, burada sistem nasıl işliyor, önce sıra mı kasa mı?', why: 'Mekândaki pratik sorunu çözer; karşı tarafı özel alana çekmez.' },
        { text: 'Merhaba, sıranın sonu burası mı? Yanlış yerden girmek istemedim.', why: 'Kısa, saygılı ve herkesin cevaplayabileceği bir sorudur.' }
      ],
      queue_entrance: [
        { text: 'Merhaba, giriş için doğru sırada mıyız, biliyor musunuz?', why: 'Ortak bekleme durumunu net şekilde kullanır.' },
        { text: 'Merhaba, bilet veya kontrol buradan mı yapılıyor?', why: 'Cevabı kolay ve ortamla doğrudan ilişkili bir sorudur.' },
        { text: 'Merhaba, içeri alınma sırası buradan mı başlıyor?', why: 'Gerçek bir ihtiyaca dayanır, zorlama görünmez.' }
      ],
      queue_transport: [
        { text: 'Merhaba, bu tarafta doğru yönde mi bekliyoruz, biliyor musunuz?', why: 'Ulaşım ortamında doğal ve faydalı bir sorudur.' },
        { text: 'Merhaba, peron/durak bilgisini siz anlayabildiniz mi?', why: 'Ortak belirsizlik üzerinden konuşmayı açar.' },
        { text: 'Merhaba, bu araçların kalkış noktası burası mı?', why: 'Kısa ve pratik bir bilgi talebidir.' }
      ],
      queue_event_entry: [
        { text: 'Merhaba, etkinlik girişi için doğru sırada mıyız?', why: 'Etkinlik bağlamını kullanır ve kişisel alana girmez.' },
        { text: 'Merhaba, salon açılınca bu sıradan mı içeri alınacağız?', why: 'Belirsizliği paylaşır; cevap doğal olarak sohbeti açabilir.' },
        { text: 'Merhaba, bilet kontrolü burada mı yapılacak biliyor musunuz?', why: 'Somut, kısa ve güvenli bir açılıştır.' }
      ],
      live_music: [
        { text: 'Merhaba, sahnedeki grubun adını biliyor musunuz? Tarzları dikkatimi çekti.', why: 'Gözle görülen ortak bir olayı kullanır ve doğal bir müzik sohbeti açar.' },
        { text: 'Bu grubu daha önce dinlediniz mi? Canlı performansları beklediğimden iyi çıktı.', why: 'Kendi gözleminizi ekler; karşı taraf isterse fikrini paylaşır.' },
        { text: 'Sizce canlı performans mı daha iyi, yoksa mekânın atmosferi mi etkiliyor?', why: 'Evet/hayırdan daha zengin ama hâlâ hafif bir soru sorar.' },
        { text: 'Bu şarkıdan sonra ortam bayağı değişti. Siz de fark ettiniz mi?', why: 'Ortak anda yaşanan değişimi kullanır; uydurma bağlam içermez.' }
      ],
      event_anchor: [
        { text: 'Merhaba, programda en çok hangi bölümü merak ediyorsunuz?', why: 'Ortak etkinlik üzerinden başlar; kişisel olmayan ama sohbet açan bir sorudur.' },
        { text: 'Etkinlik şu ana kadar beklentinizi karşıladı mı?', why: 'Fikir sorar, karşı taraf kısa veya uzun cevap verebilir.' },
        { text: 'Bu etkinlikte özellikle kaçırmamam gereken bir bölüm var mı sizce?', why: 'Tavsiye istemek doğal ve düşük baskılıdır.' },
        { text: 'Merhaba, sizce buradaki en iyi konu program mı, ortam mı?', why: 'Hafif karşılaştırma yapar ve sohbeti açar.' }
      ],
      screen: [
        { text: 'Merhaba, ekrandaki yayını siz de takip ediyor musunuz? Bir kısmını kaçırdım.', why: 'Ortak ekrana dayanır ve yardım istemek doğal bir giriş sağlar.' },
        { text: 'Maç/yayın sizce gerçekten hareketlendi mi, yoksa bana mı öyle geldi?', why: 'Yumuşak mizah ve ortak gözlem içerir.' },
        { text: 'Şu pozisyonu/gelişmeyi siz nasıl yorumladınız?', why: 'Karşı taraf ilgiliyse konuşmayı derinleştirebilir.' },
        { text: 'Burada herkes ekrana kilitlendi; önemli bir şey mi kaçırdım?', why: 'Ortam gözlemine dayanır ve zorlama değildir.' }
      ],
      book: [
        { text: 'Merhaba, rahatsız etmeyeceksem kitabı merak ettim. Okuduğunuz kadarıyla tavsiye eder misiniz?', why: 'Kitap okuyan kişiye saygı sınırı koyar ve kısa cevap imkânı bırakır.' },
        { text: 'Merhaba, kitabın kapağı dikkatimi çekti. Türü nedir, tavsiye eder misiniz?', why: 'Gözle görülen ayrıntıya dayanır; özel soru değildir.' },
        { text: 'Merhaba, sizi bölmek istemem. Bu kitap gerçekten okumaya değer mi?', why: 'Önce rahatsızlık ihtimalini kabul eder; bu daha saygılıdır.' },
        { text: 'Merhaba, bu yazarın dili ağır mı, yoksa rahat okunuyor mu?', why: 'Kitap hakkında somut ve cevaplanabilir bir soru üretir.' }
      ],
      venue_advice: [
        { text: 'Merhaba, kısa bir tavsiye sorabilir miyim? Burada gerçekten iyi dediğiniz bir şey var mı?', why: 'Mekânı ortak bağlam yapar; kişisel alana girmez.' },
        { text: 'Merhaba, burayı biliyor gibisiniz. İlk kez gelen birine ne önerirdiniz?', why: 'Karşı tarafı uzmanlaştırır ama baskı kurmaz.' },
        { text: 'Merhaba, burada kaçırılmaması gereken bir şey var mı sizce?', why: 'Kısa, doğal ve farklı yönlere açılabilir.' },
        { text: 'Merhaba, mekânı seçmişken doğru tercih yapmak istiyorum. Sizin favoriniz ne olurdu?', why: 'Tavsiye istemek sosyal ortamlarda en güvenli girişlerden biridir.' }
      ]
    },
    en: {
      ordering: [
        { text: 'Hi, I am stuck with the menu. Is there anything here you would genuinely recommend?', why: 'It asks for a simple opinion based on shared context, not personal information.' },
        { text: 'Hi, may I ask a quick menu opinion? If you were choosing safely, what would you order?', why: 'Low-pressure and easy to answer briefly.' },
        { text: 'Hi, I am trying not to make the wrong order. What is the reliable choice here?', why: 'A practical request makes the opener feel natural.' }
      ],
      queue_order_service: [
        { text: 'Hi, I do not want to join the wrong line. Is this the queue for ordering?', why: 'Specific, useful and clearly grounded in the moment.' },
        { text: 'Hi, is this line for ordering or payment?', why: 'Uses shared uncertainty rather than a forced opener.' },
        { text: 'Hi, do you know how it works here — queue first or till first?', why: 'Practical and non-intrusive.' }
      ],
      queue_entrance: [
        { text: 'Hi, do you know if this is the correct queue for entry?', why: 'Directly grounded in the shared situation.' },
        { text: 'Hi, is the ticket or check-in point here?', why: 'Short and easy to answer.' },
        { text: 'Hi, do we enter from this line when they open?', why: 'Natural in an entrance context.' }
      ],
      queue_transport: [
        { text: 'Hi, are we waiting on the correct side for this direction?', why: 'Natural in transport settings.' },
        { text: 'Hi, were you able to understand the platform or stop information?', why: 'Shared uncertainty creates a natural opening.' },
        { text: 'Hi, do the vehicles leave from this point?', why: 'A short practical question.' }
      ],
      queue_event_entry: [
        { text: 'Hi, is this the correct queue for the event entrance?', why: 'Uses the shared event context.' },
        { text: 'Hi, when the hall opens, do we enter from this line?', why: 'Specific and low-pressure.' },
        { text: 'Hi, do you know if ticket checks happen here?', why: 'Grounded and easy to answer.' }
      ],
      live_music: [
        { text: 'Hi, do you know the name of the band on stage? Their style caught my attention.', why: 'Uses a visible shared event and opens a natural music topic.' },
        { text: 'Have you heard this band before? They sound better live than I expected.', why: 'Adds a personal observation without pressuring the other person.' },
        { text: 'Do you think it is the band or the venue atmosphere that makes it work?', why: 'An easy opinion question with a clear context.' }
      ],
      event_anchor: [
        { text: 'Hi, which part of the programme are you most interested in?', why: 'Shared event context, not personal information.' },
        { text: 'Has the event met your expectations so far?', why: 'Simple opinion question.' },
        { text: 'Is there a part of the programme you think I should not miss?', why: 'A recommendation request is low-pressure.' }
      ],
      screen: [
        { text: 'Hi, are you following the screen too? I missed part of what happened.', why: 'Grounded in a shared visible situation.' },
        { text: 'Do you think the match/broadcast has just changed momentum, or is it just me?', why: 'Light and contextual.' },
        { text: 'How did you read that last moment on the screen?', why: 'Good when the other person is clearly watching.' }
      ],
      book: [
        { text: 'Hi, if I am not interrupting, I noticed the book. Would you recommend it so far?', why: 'Respectful to someone who may be focused.' },
        { text: 'Hi, the cover caught my attention. What kind of book is it?', why: 'Based on a visible detail.' },
        { text: 'Hi, I do not want to interrupt for long. Is that book worth reading?', why: 'Acknowledges the boundary first.' }
      ],
      venue_advice: [
        { text: 'Hi, may I ask a quick recommendation? Is there anything here that is genuinely good?', why: 'Venue-based and non-intrusive.' },
        { text: 'Hi, if you know this place, what would you recommend to someone choosing for the first time?', why: 'Makes it easy to answer with practical advice.' },
        { text: 'Hi, is there anything here that should not be missed?', why: 'Short and naturally open-ended.' }
      ]
    }
  };

  const venueFallbacks = {
    tr: {
      cafe: 'Merhaba, burada gerçekten iyi dediğiniz bir kahve veya tatlı var mı?',
      restaurant: 'Merhaba, menüde gerçekten tavsiye edeceğiniz bir şey var mı?',
      bar: 'Merhaba, buranın atmosferini nasıl buldunuz?',
      pub: 'Merhaba, buradaki ortam sizce nasıl?',
      event: 'Merhaba, etkinliği şu ana kadar nasıl buldunuz?',
      park: 'Merhaba, bu bölgeyi yürüyüş veya oturmak için nasıl buluyorsunuz?',
      mall: 'Merhaba, burada iyi bir kafe veya dinlenme yeri biliyor musunuz?',
      transport: 'Merhaba, buradaki yönlendirmeyi siz anlayabildiniz mi?',
      other: 'Merhaba, buradaki ortamı nasıl buldunuz?'
    },
    en: {
      cafe: 'Hi, is there a coffee or dessert here that is genuinely good?',
      restaurant: 'Hi, is there anything on the menu you would genuinely recommend?',
      bar: 'Hi, what do you think of the atmosphere here?',
      pub: 'Hi, how do you find the atmosphere here?',
      event: 'Hi, how are you finding the event so far?',
      park: 'Hi, what do you think of this area for walking or sitting?',
      mall: 'Hi, do you know a good café or rest area here?',
      transport: 'Hi, were you able to understand the directions here?',
      other: 'Hi, what do you think of the setting here?'
    }
  };

  const activitiesToAnchor = { eating: 'venue_advice', reading: 'book', phone: 'no_anchor', ordering: 'ordering', live_music: 'live_music', screen: 'screen', shared_event: 'event_anchor', group_talking: 'no_anchor' };

  const state = {
    lang: localStorage.getItem('fs_lang') || 'tr', route: 'home', favorites: JSON.parse(localStorage.getItem('fs_favorites') || '[]'),
    sp: { person: 'single', anchor: null, detail: null, variant: 0, last: null },
    venue: { name: '', location: '', type: '', nearby: [], selected: null, context: false, result: false, group: 'single', activity: 'eating', openness: 'neutral', variant: 0, lat: null, lon: null },
    rescue: { situation: null, variant: 0 }, practice: { scenario: null, selected: null }, deferredPrompt: null
  };

  const T = (k) => ui[state.lang]?.[k] || labels[state.lang]?.[k] || ui.tr[k] || labels.tr[k] || k;
  const L = (k) => labels[state.lang]?.[k] || labels.tr[k] || k;
  const esc = (v='') => String(v).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const cycle = (arr, variant) => arr[((variant % arr.length) + arr.length) % arr.length];

  function icon(name){
    const icons={spark:'<svg viewBox="0 0 24 24"><path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2Z"/></svg>',pin:'<svg viewBox="0 0 24 24"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>',rescue:'<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2"/></svg>',practice:'<svg viewBox="0 0 24 24"><path d="M4 5h16v11H8l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></svg>',heart:'<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z"/></svg>',shield:'<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.7 2.8 8.2 7 10 4.2-1.8 7-5.3 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>',back:'<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',arrow:'<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',refresh:'<svg viewBox="0 0 24 24"><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8M5.5 15a7 7 0 0 0 12.3 2.8L20 16"/></svg>',mic:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>',gps:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>'};
    return icons[name] || '';
  }

  function header(title, sub='') { return `<section class="page-head"><button class="round-button" data-back>${icon('back')}</button><div><h1>${esc(title)}</h1>${sub?`<p>${esc(sub)}</p>`:''}</div></section>`; }
  function chip(v, label, selected, group){ return `<button class="chip ${selected?'selected':''}" data-group="${group}" data-value="${v}">${esc(label)}</button>`; }
  function quick(v, label, sym, selected, attr='data-anchor'){ return `<button class="quick-choice ${selected?'selected':''}" ${attr}="${v}"><span>${sym}</span><strong>${esc(label)}</strong></button>`; }
  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>el.classList.remove('show'),2200); }
  function save(text, meta=''){ if(!text) return; if(!state.favorites.some(f=>f.text===text)){ state.favorites.unshift({id:Date.now(),text,meta}); state.favorites=state.favorites.slice(0,40); localStorage.setItem('fs_favorites',JSON.stringify(state.favorites)); } toast(T('saved')); }

  function suggestionFor(anchor, detail, variant){
    if(!anchor || anchor==='no_anchor') return {kind:'guidance', text:T('noContext'), why: state.lang==='tr'?'Zorlanmış bir cümle kötü ilk izlenim yaratır.':'A forced line creates a weak first impression.'};
    let key = anchor;
    if(anchor==='queue') key = detail ? `queue_${detail}` : null;
    const list = key && openers[state.lang][key];
    if(!list) return {kind:'guidance', text:T('noContext'), why:''};
    return {kind:'opener', ...cycle(list, variant)};
  }

  function render(){
    document.documentElement.lang=state.lang; $('#languageSelect').value=state.lang; $('#brandTagline').textContent=T('tagline'); $('#favoritesLabel').textContent=T('favorites'); $('#privacyLabel').textContent=T('privacy'); $('#networkBadge').textContent=navigator.onLine?T('online'):T('offline'); $('#networkBadge').classList.toggle('offline',!navigator.onLine);
    const routes={home,spontaneous,venue,rescue,practice,favorites,privacy}; $('#mainContent').innerHTML=(routes[state.route]||home)(); bind(); window.scrollTo({top:0,behavior:'instant'});
  }

  function home(){ return `<section class="hero"><div class="eyebrow">FIRSTSTEP BETA 0.3.3</div><h1>${T('tagline')}</h1><p>${T('homeIntro')}</p></section><section class="mode-grid"><button class="mode-card primary" data-route="spontaneous"><span class="mode-icon">${icon('spark')}</span><span><strong>${T('spontaneous')}</strong><small>${T('spontaneousDesc')}</small></span><span class="mode-arrow">${icon('arrow')}</span></button><button class="mode-card" data-route="venue"><span class="mode-icon">${icon('pin')}</span><span><strong>${T('venue')}</strong><small>${T('venueDesc')}</small></span><span class="mode-arrow">${icon('arrow')}</span></button><button class="mode-card" data-route="rescue"><span class="mode-icon">${icon('rescue')}</span><span><strong>${T('rescue')}</strong><small>${T('rescueDesc')}</small></span><span class="mode-arrow">${icon('arrow')}</span></button><button class="mode-card" data-route="practice"><span class="mode-icon">${icon('practice')}</span><span><strong>${T('practice')}</strong><small>${T('practiceDesc')}</small></span><span class="mode-arrow">${icon('arrow')}</span></button></section><section class="trust-strip"><span>${icon('shield')}</span><p>${T('privacyNote')}</p></section>`; }

  function spontaneous(){
    const s=state.sp; const ready=s.anchor && (s.anchor!=='queue'||s.detail); const res=ready?suggestionFor(s.anchor,s.detail,s.variant):null;
    const anchors=[['ordering',L('ordering'),'☕'],['queue',L('queue'),'↔'],['live_music',L('live_music'),'♫'],['event_anchor',L('event_anchor'),'✦'],['screen',L('screen'),'▣'],['book',L('book'),'▤'],['venue_advice',L('venue_advice'),'⌂'],['no_anchor',L('no_anchor'),'—']];
    return `${header(T('spontaneous'),T('spontaneousDesc'))}<section class="panel compact"><h2>${T('personQ')}</h2><div class="chip-row">${['single','pair','group'].map(v=>chip(v,L(v),s.person===v,'sp-person')).join('')}</div></section><section class="panel compact"><h2>${T('anchorQ')}</h2><div class="choice-grid quick anchor-grid">${anchors.map(a=>quick(a[0],a[1],a[2],s.anchor===a[0])).join('')}</div></section>${s.anchor==='queue'?`<section class="panel compact"><h2>${T('queueQ')}</h2><div class="choice-grid queue-detail-grid">${[['order_service',L('order_service'),'☕'],['entrance',L('entrance'),'⇥'],['transport',L('transport_q'),'⌁'],['event_entry',L('event_entry'),'✦']].map(a=>quick(a[0],a[1],a[2],s.detail===a[0],'data-detail')).join('')}</div></section>`:''}${res?resultCard(res,'sp'):''}`;
  }

  function resultCard(res, mode){
    return `<section class="result-card ${res.kind==='guidance'?'guidance-result':''}"><div class="result-label ${res.kind==='guidance'?'warning':''}">${res.kind==='guidance'?T('noLine'):T('sayNow')}</div><blockquote>${esc(res.text)}</blockquote>${res.why?`<div class="alternative"><span>${T('why')}</span><p>${esc(res.why)}</p></div>`:''}${res.kind==='opener'?`<div class="result-actions"><button class="secondary-button" data-next="${mode}">${icon('refresh')} ${T('another')}</button><button class="secondary-button" data-save="${esc(res.text)}" data-meta="${mode==='venue'?T('venue'):T('spontaneous')}">${icon('heart')} ${T('save')}</button></div>`:''}</section>`;
  }

  function likelyContexts(type){
    const tr={cafe:['Tek başına kahve içen kişiler','Menü seçen veya bekleyen kişiler','Kısa mola veren küçük gruplar'],restaurant:['Sipariş, menü veya masa bekleyen kişiler','Birlikte yemek yiyen küçük gruplar','Tavsiye sorulabilecek servis bağlamı'],bar:['Müzik veya atmosfer için gelen kişiler','Barda sipariş bekleyen kişiler','Küçük arkadaş grupları'],pub:['Maç/yayın izleyen kişiler','Sipariş veya masa bekleyen kişiler','Müzik ve sosyal atmosfer için gelen gruplar'],event:['Aynı programa katılan kişiler','Ara sırasında programı konuşabilecek katılımcılar','Sıra veya giriş bekleyen kişiler'],park:['Yürüyüş yapan kişiler','Dinlenen veya çevreyi izleyen kişiler','Açık alanda vakit geçiren küçük gruplar'],mall:['Alışveriş veya yemek molası veren kişiler','Yol tarifi veya öneri sorulabilecek ziyaretçiler','Birini bekleyen kişiler'],transport:['Araç veya peron bekleyen kişiler','Yol bilgisi arayan kişiler','Kısa süreli ortak bekleme durumu'],other:['Aynı ortamı paylaşan kişiler','Bekleyen veya çevreyi izleyen kişiler','Ortak ayrıntılar üzerinden kısa temas kurulabilecek durumlar']};
    const en={cafe:['People having coffee alone','People choosing from the menu or waiting','Small groups taking a short break'],restaurant:['People waiting for order, menu or table','Small groups eating together','A service context where advice is natural'],bar:['People there for music or atmosphere','People ordering at the bar','Small groups of friends'],pub:['People watching a match or broadcast','People waiting to order or be seated','Groups there for music and social atmosphere'],event:['People attending the same programme','Attendees who may discuss the event during a break','People waiting in line or for entry'],park:['People walking','People resting or observing the area','Small groups spending time outdoors'],mall:['People shopping or taking a food break','Visitors who can be asked for directions or recommendations','People waiting for someone'],transport:['People waiting for transport or a platform','Travellers looking for route information','A short shared waiting situation'],other:['People sharing the same setting','People waiting or observing','Situations where a visible shared detail can open brief contact']};
    return (state.lang==='tr'?tr:en)[type] || (state.lang==='tr'?tr.other:en.other);
  }

  function assess(open){
    const tr={open:'Ortam uygun görünüyor; yine de kısa, bağlama dayalı ve kolayca bitirilebilir bir giriş kullanın.',neutral:'Kısa ve düşük baskılı başlayın. İlk tepkiden sonra devam edip etmeyeceğinize karar verin.',busy:'Kişi meşgul görünüyor. Doğal bir ara yoksa yaklaşmayın.',closed:'Yaklaşmaya kapalı sinyal var. Konuşmayı başlatmamak en doğru seçenektir.'};
    const en={open:'The setting looks suitable, but keep it brief, contextual and easy to end.',neutral:'Start briefly and with low pressure. Let the first response decide whether to continue.',busy:'The person appears busy. Do not approach unless there is a natural pause.',closed:'There is a closed-off signal. The best choice is not to start.'};
    return (state.lang==='tr'?tr:en)[open];
  }

  function venueSuggestion(){
    const v=state.venue;
    if(v.openness==='closed'||v.openness==='busy') return {kind:'guidance',text:assess(v.openness),why: state.lang==='tr'?'Sosyal zeka bazen konuşmamayı bilmektir.':'Social intelligence sometimes means knowing not to approach.'};
    const anchor=activitiesToAnchor[v.activity]||'venue_advice';
    if(anchor==='no_anchor') return {kind:'guidance',text:T('noContext'),why: state.lang==='tr'?'Telefonla ilgilenme veya aktif grup konuşması zayıf giriş anıdır.':'Phone use or active group talk is a weak entry moment.'};
    const res=suggestionFor(anchor, anchor==='queue'?v.detail:null, v.variant);
    if(res.kind==='opener') return res;
    return {kind:'opener', text: venueFallbacks[state.lang][v.type]||venueFallbacks[state.lang].other, why: state.lang==='tr'?'Mekân tavsiyesi kişisel alana girmeden doğal konuşma başlatır.':'A venue recommendation starts naturally without entering personal space.'};
  }

  function venue(){
    const v=state.venue; const typeChips=['cafe','restaurant','bar','pub','event','park','mall','transport','other'].map(x=>chip(x,L(x),v.type===x,'venue-type')).join('');
    const nearby=v.nearby.length?`<section class="panel"><h2>${T('nearby')}</h2><div class="place-list">${v.nearby.map((p,i)=>`<button class="place-item ${v.selected?.id===p.id?'selected':''}" data-place="${i}"><span><strong>${esc(p.name)}</strong><small>${esc(L(p.type))}${p.distance?` · ${p.distance} m`:''}</small></span><span>${icon('arrow')}</span></button>`).join('')}<button class="place-item manual" data-manual-place><span><strong>${T('noNearby')}</strong></span><span>${icon('arrow')}</span></button></div></section>`:'';
    return `${header(T('venueTitle'),T('venueHelp'))}<section class="panel"><div class="field-grid"><label class="field"><span>${T('venueName')}</span><input id="venueName" value="${esc(v.name)}" placeholder="${esc(T('venuePlaceholder'))}"></label><label class="field"><span>${T('location')}</span><input id="locationText" value="${esc(v.location)}" placeholder="${esc(T('locationPlaceholder'))}"></label></div><div class="inline-actions three"><button class="secondary-button" data-voice="name">${icon('mic')} ${T('voiceVenue')}</button><button class="secondary-button" data-voice="location">${icon('mic')} ${T('voiceLocation')}</button><button class="primary-button" data-locate>${icon('gps')} ${T('locate')}</button></div></section>${nearby}<section class="panel"><h2>${T('venueType')}</h2><div class="chip-row wrap">${typeChips}</div><button class="primary-button full" data-create-context>${T('createContext')}</button></section>${v.context?venueContext():''}`;
  }

  function venueContext(){ const v=state.venue; const res=v.result?venueSuggestion():null; const topics=topicIdeas(v.type); return `<section class="context-banner"><div><span>${T('contextReady')}</span><strong>${esc(v.name||L(v.type))}</strong><small>${esc(v.location)}</small></div><span class="context-badge">${esc(L(v.type))}</span></section><section class="panel"><h2>${T('likely')}</h2><ul class="archetype-list">${likelyContexts(v.type).map(x=>`<li>${esc(x)}</li>`).join('')}</ul><p class="probability-note">${T('probability')}</p></section><section class="panel"><div class="section-title-row"><h2>${T('target')}</h2></div><h3>${T('personQ')}</h3><div class="chip-row wrap">${['single','pair','group'].map(x=>chip(x,L(x),v.group===x,'v-group')).join('')}</div><h3>${T('activity')}</h3><div class="chip-row wrap">${[['eating',T('eating')],['reading',T('reading')],['phone',T('phone')],['ordering',T('ordering_act')],['live_music',T('liveMusic')],['screen',T('screenAct')],['shared_event',T('sharedEvent')],['group_talking',T('groupTalking')]].map(a=>chip(a[0],a[1],v.activity===a[0],'v-activity')).join('')}</div><h3>${T('openness')}</h3><div class="chip-row wrap">${['open','neutral','busy','closed'].map(x=>chip(x,L(x),v.openness===x,'v-open')).join('')}</div><button class="primary-button full" data-generate>${T('generate')}</button></section>${res?`<section class="result-card ${res.kind==='guidance'?'guidance-result':''}"><div class="mini-section"><span>${T('assessment')}</span><p>${esc(assess(v.openness))}</p></div><div class="result-label ${res.kind==='guidance'?'warning':''}">${res.kind==='guidance'?T('noLine'):T('mainSuggestion')}</div><blockquote>${esc(res.text)}</blockquote>${res.why?`<div class="alternative"><span>${T('why')}</span><p>${esc(res.why)}</p></div>`:''}${res.kind==='opener'?`<div class="result-actions"><button class="secondary-button" data-next="venue">${icon('refresh')} ${T('another')}</button><button class="secondary-button" data-save="${esc(res.text)}" data-meta="${esc(v.name||L(v.type))}">${icon('heart')} ${T('save')}</button></div>`:''}<div class="topic-block"><strong>${T('topics')}</strong><div class="topic-chips">${topics.map(x=>`<span>${esc(x)}</span>`).join('')}</div></div></section>`:''}`; }
  function topicIdeas(type){ const tr={cafe:['Kahve/tatlı tavsiyesi','Mekânın sakin saatleri','Yakındaki başka iyi yerler'],restaurant:['Menü tavsiyesi','Yerel yemekler','Şehirdeki başka restoranlar'],bar:['Müzik','Atmosfer','Yakındaki etkinlikler'],pub:['Maç/yayın','Müzik','Sosyal etkinlikler'],event:['Program bölümleri','Konuşmacı/performans','Benzer etkinlikler'],park:['Yürüyüş rotası','Şehirde açık alanlar','Hafta sonu planları'],mall:['Mağaza tavsiyesi','Kafe/dinlenme alanı','Yol tarifi'],transport:['Güzergâh','Şehir önerileri','Yolculuk deneyimi'],other:['Ortam','Semt/şehir','Film/müzik/etkinlik']}; const en={cafe:['Coffee/dessert recommendation','Quiet times at the venue','Other good nearby places'],restaurant:['Menu recommendation','Local food','Other restaurants in the city'],bar:['Music','Atmosphere','Nearby events'],pub:['Match/broadcast','Music','Social events'],event:['Programme parts','Speaker/performance','Similar events'],park:['Walking routes','Outdoor places','Weekend plans'],mall:['Shop recommendation','Café/rest area','Directions'],transport:['Route','City tips','Travel experience'],other:['Setting','Neighbourhood/city','Film/music/event']}; return (state.lang==='tr'?tr:en)[type]||[]; }

  const rescues={tr:{silence:['Kısa bir ortam sorusuna dönün: “Bu mekânı nasıl buldunuz?”','Yeni ve hafif bir konu açın: “Son zamanlarda tavsiye edeceğiniz bir film oldu mu?”'],short_answer:['Bir kez daha düşük baskılı deneyin: “Anladım. Burada en sevdiğiniz şey ne?”','Cevap yine kısa kalırsa nazikçe bitirin: “Sizi tutmayayım, iyi vakitler.”'],asks_question:['Kısa cevap verin, sonra aynı konuyu ona çevirin: “Siz nasıl düşünüyorsunuz?”','Cevabınıza küçük bir kişisel detay ekleyip tekrar soru sorun.'],topic_ended:['Ortak bağlama dönün: “Bu arada buraya sık gelir misiniz?”','Konu değiştirin: “Bu bölgede tavsiye edeceğiniz başka bir yer var mı?”'],interested:['Açık uçlu takip sorun: “Sizin için en iyi kısmı neydi?”','Kısa bir şey paylaşın ve tekrar ona dönün.'],leaving:['“Tanıştığımıza memnun oldum. Sizi daha fazla tutmayayım.”','“İyi vakit geçirmenizi dilerim. Görüşmek üzere.”'],joined_group:['Yeni gelen kişiye bağlam verin: “Biz de tam … hakkında konuşuyorduk.”','Gruba yöneltin: “Siz bu konuda ne düşünüyorsunuz?”']},en:{silence:['Return to a setting question: “What do you think of this place?”','Open a light new topic: “Have you seen any film lately that you would recommend?”'],short_answer:['Try once more with low pressure: “I see. What do you like most here?”','If the answer stays short, exit politely: “I won’t keep you. Enjoy your time.”'],asks_question:['Answer briefly, then return it: “What do you think?”','Add one small personal detail and ask them back.'],topic_ended:['Return to shared context: “Do you come here often?”','Shift topic: “Is there another place nearby you would recommend?”'],interested:['Ask an open follow-up: “What was the best part for you?”','Share something brief and return to them.'],leaving:['“It was nice meeting you. I won’t keep you.”','“Enjoy the rest of your time here. See you.”'],joined_group:['Give the newcomer context: “We were just talking about …”','Ask the group: “What do you think about this?”']}};
  function rescue(){ const keys=['silence','short_answer','asks_question','topic_ended','interested','leaving','joined_group']; const s=state.rescue; const arr=s.situation?rescues[state.lang][s.situation]:null; return `${header(T('rescueTitle'),T('rescueSubtitle'))}<section class="choice-grid rescue-grid">${keys.map(k=>quick(k,T(k),{silence:'…',short_answer:'—',asks_question:'?',topic_ended:'↪',interested:'+',leaving:'↗',joined_group:'◎'}[k],s.situation===k,'data-rescue')).join('')}</section>${arr?`<section class="result-card"><div class="result-label">${T('doThis')}</div><blockquote>${esc(cycle(arr,s.variant))}</blockquote><div class="alternative"><span>${T('alternative')}</span><p>${esc(cycle(arr,s.variant+1))}</p></div><div class="result-actions"><button class="secondary-button" data-next="rescue">${icon('refresh')} ${T('another')}</button><button class="secondary-button" data-save="${esc(cycle(arr,s.variant))}" data-meta="${T('rescue')}">${icon('heart')} ${T('save')}</button></div></section>`:''}`; }

  const practices={tr:[['Kafede menü','Yanınızdaki kişi de menüye bakıyor.',['Burada neyin iyi olduğunu biliyor musunuz?','Bu sıra çok uzun.','Neden karar veremiyorsunuz?'],0,'Ben de tam karar vermeye çalışıyordum; tatlılar iyi görünüyor.','Ortak karar verme anına dayanır ve kişisel değildir.'],['Etkinlik arası','Bir katılımcı programı inceliyor.',['Etkinliği şu ana kadar nasıl buldunuz?','Tek başınıza mı geldiniz?','Ne iş yapıyorsunuz?'],0,'Oldukça iyi, özellikle ikinci konuşmayı beğendim.','Ortak etkinlikten başlar, özel alana girmez.'],['Canlı müzik','Yanınızdaki kişi sahnedeki grubu dinliyor.',['Grubun adını biliyor musunuz?','Buraya kiminle geldiniz?','Çok gürültülü değil mi?'],0,'Evet, geçen yıl da burada çalmışlardı.','Gözle görülen ortak etkinliği kullanır.']],en:[['Café menu','The person beside you is also looking at the menu.',['Do you know what is good here?','This queue is very long.','Why can’t you decide?'],0,'I am also trying to decide; the desserts look good.','It is based on a shared decision moment.'],['Event break','An attendee is reading the programme.',['How are you finding the event so far?','Did you come alone?','What do you do for work?'],0,'It is quite good. I especially liked the second talk.','Starts from the shared event.'],['Live music','The person beside you is listening to the band.',['Do you know the band’s name?','Who did you come with?','Isn’t it too loud?'],0,'Yes, they played here last year too.','Uses a visible shared event.']]};
  function practice(){ const list=practices[state.lang]; const idx=state.practice.scenario; if(idx===null) return `${header(T('practice'),T('practiceDesc'))}<section class="scenario-list">${list.map((s,i)=>`<button class="scenario-card" data-scenario="${i}"><span>${icon('practice')}</span><div><strong>${esc(s[0])}</strong><small>${esc(s[1])}</small></div>${icon('arrow')}</button>`).join('')}</section>`; const s=list[idx]; const chosen=state.practice.selected; return `${header(s[0],s[1])}<section class="panel"><h2>${ui[state.lang].chooseOpener||'Choose the best opener'}</h2><div class="answer-list">${s[2].map((a,i)=>`<button class="answer ${chosen===i?'selected':''} ${chosen!==null&&i===s[3]?'best':''}" data-practice-choice="${i}">${esc(a)}</button>`).join('')}</div></section>${chosen!==null?`<section class="result-card"><div class="result-label ${chosen===s[3]?'success':'warning'}">${chosen===s[3]?(state.lang==='tr'?'Güçlü seçim':'Strong choice'):(state.lang==='tr'?'Daha iyi seçenek vardı':'There was a better option')}</div><div class="mini-section"><span>${state.lang==='tr'?'Karşı tarafın olası cevabı':'Possible response'}</span><p>“${esc(s[4])}”</p></div><div class="mini-section"><span>${T('why')}</span><p>${esc(s[5])}</p></div><button class="primary-button full" data-practice-reset>${state.lang==='tr'?'Başka senaryo':'Another scenario'}</button></section>`:''}`; }
  function favorites(){ return `${header(T('favorites'))}${state.favorites.length?`<section class="favorite-list">${state.favorites.map(f=>`<article class="favorite-card"><div><blockquote>${esc(f.text)}</blockquote><small>${esc(f.meta||'')}</small></div><button class="round-button small" data-del-fav="${f.id}">×</button></article>`).join('')}</section><button class="danger-button" data-clear-fav>${T('clearFav')}</button>`:`<section class="empty-state">${icon('heart')}<p>${T('noFav')}</p></section>`}`; }
  function privacy(){ return `${header(T('privacyTitle'))}<section class="panel privacy-panel"><span class="privacy-icon">${icon('shield')}</span><p>${T('privacyBody')}</p></section><section class="panel"><button class="danger-button" data-clear-all>${T('clearAll')}</button></section><section class="panel source-panel"><h2>Open data</h2><p>Venue search uses OpenStreetMap / Nominatim / Overpass only when requested. © OpenStreetMap contributors. ODbL.</p></section>`; }

  function bind(){
    $$('[data-route]').forEach(e=>e.onclick=()=>{state.route=e.dataset.route; render();}); $$('[data-back]').forEach(e=>e.onclick=()=>{state.route='home'; render();});
    $$('[data-group]').forEach(e=>e.onclick=()=>{const g=e.dataset.group,v=e.dataset.value;if(g==='sp-person')state.sp.person=v;if(g==='venue-type')state.venue.type=v;if(g==='v-group')state.venue.group=v;if(g==='v-activity'){state.venue.activity=v;state.venue.result=false;}if(g==='v-open'){state.venue.openness=v;state.venue.result=false;}render();});
    $$('[data-anchor]').forEach(e=>e.onclick=()=>{state.sp.anchor=e.dataset.anchor;state.sp.detail=null;state.sp.variant=0;render();}); $$('[data-detail]').forEach(e=>e.onclick=()=>{state.sp.detail=e.dataset.detail;state.sp.variant=0;render();});
    $$('[data-next]').forEach(e=>e.onclick=()=>{const m=e.dataset.next;if(m==='sp')state.sp.variant++;if(m==='venue')state.venue.variant++;if(m==='rescue')state.rescue.variant++;render();});
    $$('[data-save]').forEach(e=>e.onclick=()=>save(e.dataset.save,e.dataset.meta));
    $('#venueName')?.addEventListener('input',e=>state.venue.name=e.target.value); $('#locationText')?.addEventListener('input',e=>state.venue.location=e.target.value);
    $('[data-create-context]')?.addEventListener('click',()=>{state.venue.name=$('#venueName')?.value.trim()||state.venue.name; state.venue.location=$('#locationText')?.value.trim()||state.venue.location; if(!state.venue.name&&!state.venue.location)return toast(T('nameRequired')); if(!state.venue.type)return toast(T('typeRequired')); state.venue.context=true; state.venue.result=false; render();});
    $('[data-generate]')?.addEventListener('click',()=>{state.venue.result=true; state.venue.variant=0; render();});
    $('[data-locate]')?.addEventListener('click',locate); $$('[data-place]').forEach(e=>e.onclick=()=>{const p=state.venue.nearby[Number(e.dataset.place)]; if(p){Object.assign(state.venue,{selected:p,name:p.name,type:p.type,lat:p.lat,lon:p.lon}); render();}}); $('[data-manual-place]')?.addEventListener('click',()=>{state.venue.nearby=[];state.venue.selected=null;render();}); $$('[data-voice]').forEach(e=>e.onclick=()=>voice(e.dataset.voice));
    $$('[data-rescue]').forEach(e=>e.onclick=()=>{state.rescue.situation=e.dataset.rescue;state.rescue.variant=0;render();}); $$('[data-scenario]').forEach(e=>e.onclick=()=>{state.practice.scenario=Number(e.dataset.scenario);state.practice.selected=null;render();}); $$('[data-practice-choice]').forEach(e=>e.onclick=()=>{state.practice.selected=Number(e.dataset.practiceChoice);render();}); $('[data-practice-reset]')?.addEventListener('click',()=>{state.practice.scenario=null;state.practice.selected=null;render();});
    $$('[data-del-fav]').forEach(e=>e.onclick=()=>{state.favorites=state.favorites.filter(f=>f.id!==Number(e.dataset.delFav));localStorage.setItem('fs_favorites',JSON.stringify(state.favorites));render();}); $('[data-clear-fav]')?.addEventListener('click',()=>{state.favorites=[];localStorage.setItem('fs_favorites','[]');render();}); $('[data-clear-all]')?.addEventListener('click',()=>{localStorage.clear();state.favorites=[];toast(T('cleared'));render();});
  }

  function mapType(tags={}){const a=tags.amenity;if(a==='cafe')return'cafe';if(['restaurant','fast_food','food_court'].includes(a))return'restaurant';if(['bar','nightclub'].includes(a))return'bar';if(['pub','biergarten'].includes(a))return'pub';return'other';}
  function dist(a,b,c,d){const R=6371000,rad=x=>x*Math.PI/180,p1=rad(a),p2=rad(c),dp=rad(c-a),dl=rad(d-b),q=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;return Math.round(R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q)));}
  async function locate(){ if(!navigator.geolocation)return toast(T('geoError')); navigator.geolocation.getCurrentPosition(async pos=>{try{const{latitude:lat,longitude:lon}=pos.coords;state.venue.lat=lat;state.venue.lon=lon; const [loc,near]=await Promise.all([reverse(lat,lon),nearby(lat,lon)]); state.venue.location=loc; state.venue.nearby=near; if(!near.length)toast(T('noPlaces')); render();}catch(e){console.error(e);toast(T('geoError'));}},()=>toast(T('geoError')),{enableHighAccuracy:true,timeout:12000,maximumAge:60000});}
  async function reverse(lat,lon){const u=new URL('https://nominatim.openstreetmap.org/reverse');u.searchParams.set('format','jsonv2');u.searchParams.set('lat',lat);u.searchParams.set('lon',lon);u.searchParams.set('zoom','16');u.searchParams.set('addressdetails','1');const r=await fetch(u);if(!r.ok)throw new Error('nom');const d=await r.json(),a=d.address||{};return [a.suburb||a.neighbourhood||a.city_district,a.city||a.town||a.village||a.state,a.country].filter(Boolean).filter((x,i,arr)=>arr.indexOf(x)===i).join(', ')||d.display_name||'';}
  async function nearby(lat,lon){const q=`[out:json][timeout:18];(nwr(around:500,${lat},${lon})["amenity"~"cafe|restaurant|bar|pub|fast_food|food_court|nightclub|biergarten"];);out center tags 40;`;const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:q})});if(!r.ok)throw new Error('overpass');const d=await r.json(),seen=new Set();return (d.elements||[]).map(el=>{const plat=el.lat??el.center?.lat,plon=el.lon??el.center?.lon,name=el.tags?.name||el.tags?.brand;if(!name||!plat||!plon)return null;const key=`${name}|${plat.toFixed(5)}|${plon.toFixed(5)}`;if(seen.has(key))return null;seen.add(key);return{id:`${el.type}-${el.id}`,name,type:mapType(el.tags),lat:plat,lon:plon,distance:dist(lat,lon,plat,plon)}}).filter(Boolean).sort((a,b)=>a.distance-b.distance).slice(0,12);}
  function voice(target){const R=window.SpeechRecognition||window.webkitSpeechRecognition;if(!R)return toast(T('voiceUnsupported'));const rec=new R();rec.lang=state.lang==='tr'?'tr-TR':'en-US';rec.interimResults=false;rec.maxAlternatives=1;toast(T('listening'));rec.onresult=e=>{const text=e.results[0][0].transcript.trim();if(target==='location')state.venue.location=text;else state.venue.name=text;render();};rec.onerror=()=>toast(T('voiceUnsupported'));rec.start();}

  function global(){ $('#brandButton').onclick=()=>{state.route='home';render();}; $('#languageSelect').onchange=e=>{state.lang=e.target.value;localStorage.setItem('fs_lang',state.lang);render();}; $('#favoritesButton').onclick=()=>{state.route='favorites';render();}; $('#privacyButton').onclick=()=>{state.route='privacy';render();}; $('#installButton').onclick=()=> state.deferredPrompt ? state.deferredPrompt.prompt() : toast(T('installHint')); window.addEventListener('online',render);window.addEventListener('offline',render); window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredPrompt=e;$('#installButton').classList.remove('hidden');}); }
  async function sw(){ if('serviceWorker' in navigator && location.protocol!=='file:'){ try{await navigator.serviceWorker.register('./service-worker.js?v=0.3.3')}catch(e){console.warn(e)} } }
  global(); render(); sw();
})();
