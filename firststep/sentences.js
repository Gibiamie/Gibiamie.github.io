/* FirstStep — conversation starter sentence bank.
   Organized by venue category, then by social intent.
   Each [category][intent] holds 2-3 specific, low-pressure variants
   so "Başka öneri" can rotate without repeating and without going generic. */

import { CATEGORY } from './classify.js?v=3.0.0';

export const INTENT = {
  APPROACH: 'approach',
  SILENCE: 'silence',
  JOIN_GROUP: 'join_group',
  ASKED_QUESTION: 'asked_question',
  END_POLITELY: 'end_politely',
};

export const INTENT_LABEL = {
  [INTENT.APPROACH]: 'Birine yaklaş',
  [INTENT.SILENCE]: 'Sessizlik oldu',
  [INTENT.JOIN_GROUP]: 'Gruba katıl',
  [INTENT.ASKED_QUESTION]: 'Bana soru sordu',
  [INTENT.END_POLITELY]: 'Kibarca bitir',
};

const BANK = {
  [CATEGORY.CAFE]: {
    [INTENT.APPROACH]: [
      'Merhaba, burada kahve için gerçekten iyi dediğiniz bir seçenek var mı?',
      'Merhaba, menüde kararsız kaldım. Buranın imzası sayılabilecek bir kahvesi var mı?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada, buranın kahvesi normal filtreden mi yoksa kendi harmanları mı, biliyor musunuz?',
      'Şu oturma köşesi bayağı sakin duruyor, hep böyle mi sizce?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, burası biraz doluymuş. Şu masanın ucuna ilişebilir miyim?',
      'Selam, kahve beklerken sohbetinize kulak misafiri oldum, katılmamın sakıncası var mı?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Aslında burayı ilk kez deniyorum, ben de öğreniyorum. Siz sık mı gelirsiniz buraya?',
      'Doğrusu emin değilim ama merak ettim, siz genelde ne sipariş edersiniz burada?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet güzeldi, ben kahvemi alıp devam edeyim. İyi günler dilerim.',
      'Vaktinizi aldım, teşekkür ederim. Kahveniz güzel geçsin.',
    ],
  },

  [CATEGORY.RESTAURANT]: {
    [INTENT.APPROACH]: [
      'Merhaba, buraya ilk kez geldim. Burada gerçekten tavsiye edeceğiniz bir yemek var mı?',
      'Merhaba, menü biraz kalabalık geldi. Sizce hangi yemek burada öne çıkıyor?',
    ],
    [INTENT.SILENCE]: [
      'Siparişi beklerken sordum, buranın en çok tercih edilen tatlısı hangisi acaba?',
      'Bu arada porsiyonlar genelde paylaşımlık mı, yoksa tek kişilik mi geliyor sizce?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, masa biraz kalabalıkmış gibi ama uygun görürseniz kısa süreliğine katılabilir miyim?',
      'Selam, aynı mekânda görünce sordum, sizinle birlikte oturmamızın bir sakıncası var mı?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ilk defa geliyorum, bilmiyorum ama sizce şef spesiyali burada iyi mi?',
      'Emin değilim, ben de yeni öğreniyorum. Siz burayı sık tercih eder misiniz?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet için teşekkürler, yemeğim geldi. Afiyet olsun, iyi akşamlar.',
      'Keyifliydi, ben masaya döneyim. İyi yemekler dilerim.',
    ],
  },

  [CATEGORY.BAR]: {
    [INTENT.APPROACH]: [
      'Merhaba, ortamı çok iyi bilmiyorum. Burada oturmak için en iyi taraf neresi sizce?',
      'Merhaba, ilk kez geldim. Buranın imza kokteyli var mı, denemeye değer bir şey?',
    ],
    [INTENT.SILENCE]: [
      'Müzik güzelmiş bu arada, burada genelde canlı performans da oluyor mu?',
      'Bar tarafı biraz kalabalık görünüyor, hep bu kadar dolu mu oluyor buralar?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, yalnız geldim de, izniniz olursa birkaç dakika yanınıza oturabilir miyim?',
      'Selam, grubunuz eğlenceli görünüyor. Bir içimlik katılmamın sakıncası var mı?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Doğrusu ben de yeniyim burada, bilmiyorum. Siz buraya sık gelir misiniz?',
      'Emin değilim açıkçası, ilk seferim. Sizce burada denemeye değer ne var?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet keyifliydi, ben arkadaşlarımın yanına döneyim. İyi eğlenceler.',
      'Tanıştığımıza sevindim, ben burada bırakayım. İyi akşamlar.',
    ],
  },

  [CATEGORY.PUB]: {
    [INTENT.APPROACH]: [
      'Merhaba, buranın musluk birası çeşitleri konusunda bir tavsiyeniz var mı?',
      'Merhaba, ilk kez geldim. Burada maç akşamları da bu kadar dolu oluyor mu?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada burada genelde canlı yayın mı oluyor, yoksa sadece müzik mi çalıyor?',
      'Şu köşedeki masalar hep bu kadar hareketli mi oluyor sizce?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, oyun oynadığınızı gördüm, izin verirseniz izlemek için yanınıza gelebilir miyim?',
      'Selam, masanız neşeli görünüyor. Bir tur için katılabilir miyim?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de ilk kez geliyorum, bilmiyorum. Siz burayı nasıl buldunuz?',
      'Emin değilim doğrusu, yeni tanıyorum burayı. Favori biranız hangisi?',
    ],
    [INTENT.END_POLITELY]: [
      'Keyifli bir sohbetti, ben masaya döneyim. İyi eğlenceler.',
      'Konuştuğumuza memnun oldum, izninizle ayrılayım. İyi akşamlar.',
    ],
  },

  [CATEGORY.BEAUTY]: {
    [INTENT.APPROACH]: [
      'Merhaba, burayı ilk kez görüyorum. Randevu mu gerekiyor, yoksa direkt girebiliyor muyuz?',
      'Merhaba, bekleme süresi genelde ne kadar oluyor burada, bilginiz var mı?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada burada özellikle iyi oldukları bir hizmet var mı, duydunuz mu?',
      'Sırada beklerken sordum, buraya sık gelir misiniz, memnun musunuz genelde?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, bekleme alanı doluymuş. Şuraya oturmamın bir sakıncası var mı?',
      'Selam, aynı saate randevumuz denk gelmiş galiba, siz de mi bekliyorsunuz?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de ilk kez geldim, bilmiyorum. Siz burayı nereden duydunuz?',
      'Emin değilim doğrusu, yeni müşteriyim. Genelde memnun kalıyor musunuz buradan?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet güzeldi, sıram geldi galiba. İyi günler dilerim.',
      'Vaktinizi aldım, teşekkürler. İyi günler, güzel görünüyorsunuz bu arada.',
    ],
  },

  [CATEGORY.FITNESS]: {
    [INTENT.APPROACH]: [
      'Merhaba, burayı merak ettim. Günlük giriş veya deneme imkânı var mı biliyor musunuz?',
      'Merhaba, ilk kez geliyorum. Burada en yoğun olmayan saatler hangileri sizce?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada bu ekipmanı ilk kez kullanıyorum, doğru mu tutuyorum acaba?',
      'Salon genelde bu kadar dolu mu oluyor, yoksa bugün özel bir durum mu var?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, grup dersine katılmak istiyorum ama yeriniz var mı bilmiyorum, sorabilir miyim?',
      'Selam, birlikte ısınma yapıyor gibisiniz, katılmamın bir sakıncası var mı?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de yeniyim burada, bilmiyorum. Siz düzenli mi gelirsiniz?',
      'Emin değilim doğrusu, ilk haftam. Hangi antrenmanı tavsiye edersiniz yeni başlayana?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet güzeldi, ben antrenmana devam edeyim. İyi çalışmalar.',
      'Tanıştığımıza memnun oldum, izninizle devam edeyim. Kolay gelsin.',
    ],
  },

  [CATEGORY.HEALTH]: {
    [INTENT.APPROACH]: [
      'Merhaba, sırayı doğru anladım mı emin değilim. Bu sıra hangi işlem için bekliyor?',
      'Merhaba, bekleme süresi hakkında bir fikriniz var mı, yaklaşık ne kadar sürüyor?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada burada randevu sistemi mi var, yoksa sıraya göre mi çağırıyorlar?',
      'Bekleme biraz uzun sürüyor galiba, siz de mi ilk kez geldiniz?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, bu sıra aynı bankoya mı gidiyor, arkanıza geçebilir miyim?',
      'Selam, siz de mi bu işlem için bekliyorsunuz, sıra nasıl işliyor bilginiz var mı?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de ilk kez geldim, tam bilmiyorum. Siz daha önce gelmiş miydiniz?',
      'Emin değilim doğrusu, yeni tanıyorum burayı. Nereden başlamam gerekiyor sizce?',
    ],
    [INTENT.END_POLITELY]: [
      'Sıram geldi galiba, konuştuğumuza memnun oldum. Geçmiş olsun, iyi günler.',
      'Teşekkür ederim, ben içeri geçeyim. İyi günler dilerim.',
    ],
  },

  [CATEGORY.SHOP]: {
    [INTENT.APPROACH]: [
      'Merhaba, hızlıca aradığımı bulmaya çalışıyorum. Bu ürünler genelde hangi tarafta oluyor?',
      'Merhaba, burada ilk kez alışveriş yapıyorum. Kasa şu taraftan mı, biliyor musunuz?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada raflar sürekli değişiyor mu, yoksa hep bu düzende mi duruyor?',
      'Burası biraz kalabalık, hep bu saatlerde böyle mi oluyor sizce?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, siz de aynı ürünü mü arıyorsunuz? Birlikte bakabilir miyiz?',
      'Selam, kasada sıra sizden mi başlıyor, arkanıza geçebilir miyim?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de burada yeniyim, bilmiyorum. Siz sık gelir misiniz buraya?',
      'Emin değilim doğrusu, ilk kez geldim. Buranın en pratik tarafı neresi sizce?',
    ],
    [INTENT.END_POLITELY]: [
      'Yardımınız için teşekkürler, ben kasaya geçeyim. İyi günler dilerim.',
      'Vaktinizi aldım, sağ olun. İyi alışverişler.',
    ],
  },

  [CATEGORY.BEACH]: {
    [INTENT.APPROACH]: [
      'Merhaba, burayı çok iyi bilmiyorum. Gün batımı veya deniz için en iyi taraf neresi?',
      'Merhaba, ilk kez geldim buraya. Şezlong alanı mı, yoksa serbest alan mı daha rahat sizce?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada deniz burada genelde bu kadar sakin mi oluyor?',
      'Rüzgâr bugün biraz farklıymış, buralarda sık mı böyle oluyor?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, yanınıza serilmemin bir sakıncası var mı, burası biraz kalabalık da.',
      'Selam, top oynuyorsunuz galiba, bir el katılabilir miyim?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de ilk kez geldim buraya, bilmiyorum. Siz sık gelir misiniz?',
      'Emin değilim doğrusu, yeni keşfediyorum burayı. En sakin saat hangisi sizce?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet güzeldi, ben biraz yürüyeyim. İyi tatiller dilerim.',
      'Tanıştığımıza memnun oldum, izninizle devam edeyim. Keyifli günler.',
    ],
  },

  [CATEGORY.HOTEL]: {
    [INTENT.APPROACH]: [
      'Merhaba, burada ilk kez kalıyorum. Kahvaltı alanı ya da havuz için önerin var mı?',
      'Merhaba, lobiye yeni indim. Resepsiyon şu taraftan mı, biliyor musunuz?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada burada aktivite programı var mı, yoksa herkes kendi başına mı takılıyor?',
      'Manzara gerçekten güzelmiş, sizin odanız da bu taraftan mı?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, havuz kenarı biraz kalabalık, şu şezlonga geçebilir miyim?',
      'Selam, aynı gruptan mısınız, kahvaltıda size katılabilir miyim?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de yeni geldim, bilmiyorum. Siz daha önce kalmış mıydınız burada?',
      'Emin değilim doğrusu, ilk gecemiz. Otel hakkında bir tavsiyeniz var mı?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet güzeldi, ben odama çıkayım. İyi tatiller dilerim.',
      'Tanıştığımıza memnun oldum, izninizle devam edeyim. İyi kalışlar.',
    ],
  },

  [CATEGORY.MALL]: {
    [INTENT.APPROACH]: [
      'Merhaba, burada biraz kayboldum. Yönlendirme haritası ya da danışma şu taraftan mı?',
      'Merhaba, ilk kez geldim. Bu katta öne çıkan bir mağaza var mı sizce?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada burası hafta sonları hep bu kadar kalabalık mı oluyor?',
      'Asansörler bu taraftan mıydı, yoksa yürüyen merdiven mi daha hızlı?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, aynı mağazayı mı bekliyoruz, sırada arkanıza geçebilir miyim?',
      'Selam, siz de mi bu etkinliği izliyorsunuz, yanınıza geçebilir miyim?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de burada yeniyim, bilmiyorum. Siz sık gelir misiniz buraya?',
      'Emin değilim doğrusu, ilk ziyaretim. En pratik giriş-çıkış hangisi sizce?',
    ],
    [INTENT.END_POLITELY]: [
      'Yardımınız için teşekkürler, ben devam edeyim. İyi alışverişler.',
      'Vaktinizi aldım, sağ olun. İyi günler dilerim.',
    ],
  },

  [CATEGORY.ENTERTAINMENT]: {
    [INTENT.APPROACH]: [
      'Merhaba, seans saatlerini tam çözemedim. Bu gösterim şu salonda mı sizce?',
      'Merhaba, ilk kez geldim. Bilet gişesi mi, yoksa otomat mı daha hızlı oluyor?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada salon içi genelde bu kadar kalabalık mı oluyor bu saatte?',
      'Ara verildi galiba, buranın büfesi iyi mi sizce?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, sırada arkanıza geçebilir miyim, aynı seansı bekliyoruz galiba?',
      'Selam, siz de mi bu gösterimi izleyeceksiniz, yan koltuğa geçebilir miyim?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de ilk kez geldim, bilmiyorum. Siz sık gelir misiniz buraya?',
      'Emin değilim doğrusu, yeni tanıyorum burayı. Hangi salonu önerirsiniz?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet güzeldi, seans başlamak üzere. İyi seyirler dilerim.',
      'Tanıştığımıza memnun oldum, izninizle içeri geçeyim. İyi eğlenceler.',
    ],
  },

  [CATEGORY.CULTURE]: {
    [INTENT.APPROACH]: [
      'Merhaba, burayı ilk kez geziyorum. Kaçırılmaması gereken bir bölüm var mı sizce?',
      'Merhaba, rehberli tur var mı yoksa serbest mi geziliyor, biliyor musunuz?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada bu eser hakkında bir şey biliyor musunuz, oldukça ilgi çekici duruyor?',
      'Burası hep bu kadar sakin mi oluyor, yoksa bugün özel bir durum mu var?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, aynı bölümü mü inceliyorsunuz, ben de katılabilir miyim?',
      'Selam, turunuza kısa süreliğine eşlik edebilir miyim, çok merak ettim de?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de ilk kez geldim, bilmiyorum. Siz sık gelir misiniz buraya?',
      'Emin değilim doğrusu, yeni keşfediyorum. En etkileyici bulduğunuz bölüm hangisi?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet güzeldi, ben gezmeye devam edeyim. Keyifli bir ziyaret dilerim.',
      'Tanıştığımıza memnun oldum, izninizle devam edeyim. İyi günler.',
    ],
  },

  [CATEGORY.TRANSPORT]: {
    [INTENT.APPROACH]: [
      'Merhaba, yanlış yerde beklemeyeyim. Bu sıra hangi yön/işlem için?',
      'Merhaba, burada ilk kez seyahat ediyorum. Doğru peron/kapı burası mı sizce?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada tarifeler genelde zamanında mı işliyor buralarda?',
      'Bekleme biraz uzadı galiba, siz de mi aynı seferi bekliyorsunuz?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, aynı sefere mi biniyorsunuz, arkanıza geçebilir miyim?',
      'Selam, siz de mi bu hattı bekliyorsunuz, birlikte bekleyebilir miyiz?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de bu bölgede yeniyim, tam bilmiyorum. Siz sık kullanır mısınız burayı?',
      'Emin değilim doğrusu, ilk kez geçiyorum buradan. Hangi çıkış daha pratik sizce?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet güzeldi, seferim geldi galiba. İyi yolculuklar dilerim.',
      'Tanıştığımıza memnun oldum, izninizle geçeyim. İyi yolculuklar.',
    ],
  },

  [CATEGORY.UNKNOWN]: {
    [INTENT.APPROACH]: [
      'Merhaba, burayı çok iyi bilmiyorum. Burada yeni gelen biri neyi bilmeli?',
      'Merhaba, ilk kez buradayım. Burada dikkat etmemi tavsiye edeceğiniz bir şey var mı?',
    ],
    [INTENT.SILENCE]: [
      'Bu arada burayı sık kullanır mısınız, nasıl bir yer burası?',
      'Burası hep bu kadar sakin/kalabalık mı oluyor sizce?',
    ],
    [INTENT.JOIN_GROUP]: [
      'Merhaba, yanınıza kısa süreliğine katılabilir miyim, yalnız geldim de.',
      'Selam, siz de mi yeni geldiniz, birlikte bakınabilir miyiz?',
    ],
    [INTENT.ASKED_QUESTION]: [
      'Açıkçası ben de ilk kez geldim, bilmiyorum. Siz sık gelir misiniz buraya?',
      'Emin değilim doğrusu, yeni tanıyorum burayı. Neyi önerirsiniz bana?',
    ],
    [INTENT.END_POLITELY]: [
      'Sohbet güzeldi, ben devam edeyim. Tanıştığımıza memnun oldum.',
      'Vaktinizi aldım, teşekkürler. İyi günler dilerim.',
    ],
  },
};

/**
 * Get a sentence for category+intent, avoiding immediate repetition of `lastSentence`.
 */
export function getSentence(category, intent, lastSentence) {
  const forCategory = BANK[category] || BANK[CATEGORY.UNKNOWN];
  const variants = forCategory[intent] || BANK[CATEGORY.UNKNOWN][intent];
  if (variants.length === 1) return variants[0];
  const choices = lastSentence ? variants.filter((v) => v !== lastSentence) : variants;
  const pool = choices.length ? choices : variants;
  return pool[Math.floor(Math.random() * pool.length)];
}
