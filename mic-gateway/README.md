# MIC Market Gateway — Kurulum Rehberi

Bu servis, MIC uygulamasına **gerçek 1 saatlik ve 4 saatlik** ABD hisse/ETF ve kripto OHLCV verisi sağlar.

## Önemli ayrım

- **Gateway adresi:** Deploy sonrasında Render tarafından verilen `https://...onrender.com` adresidir.
- **Gateway erişim tokeni:** Uygulama sahibi tarafından oluşturulan isteğe bağlı paroladır. Bir veri sağlayıcısından alınmaz.
- **Alpaca API Key / Secret:** Yalnızca sunucuya girilir; MIC tarayıcısına veya GitHub koduna yazılmaz.
- **Normal kullanıcı:** Gateway adresi veya anahtar girmez. Sistem yöneticisi bağlantıyı bir kez kurar.

## 1. Alpaca anahtarlarını al

1. Ücretsiz Alpaca hesabı oluştur.
2. Alpaca Dashboard içindeki **API Keys** bölümünü aç.
3. Paper/Basic API Key ID ve Secret Key üret.
4. Secret Key yalnızca ilk gösterildiğinde güvenli bir yere kaydet.

## 2. Render üzerinde deploy et

1. Render Dashboard'u aç.
2. **New → Blueprint** seç.
3. GitHub hesabını bağla ve `Gibiamie/Gibiamie.github.io` reposunu seç.
4. Blueprint dosya yolu olarak `mic-gateway/render.yaml` gir.
5. Render aşağıdaki gizli değişkenleri isteyecek:
   - `ALPACA_API_KEY_ID`
   - `ALPACA_API_SECRET_KEY`
   - `GATEWAY_ACCESS_TOKEN`
6. `GATEWAY_ACCESS_TOKEN` için en az 32 karakterlik rastgele bir değer kullan.
7. Deploy işlemini başlat.

## 3. Gateway adresini al

Deploy tamamlandığında Render servis sayfasında şu biçimde bir adres görünür:

```text
https://mic-market-gateway-xxxx.onrender.com
```

Bu adresi MIC uygulamasındaki **Gateway adresi** alanına gir.

## 4. MIC'e bağla

1. MIC → **Ayarlar**
2. **1 Saat / 4 Saat Veri Bağlantısı**
3. Gateway adresini yapıştır.
4. Render'da kullandığın `GATEWAY_ACCESS_TOKEN` değerini **Erişim anahtarı** alanına yapıştır.
5. **Kaydet**
6. **Bağlantıyı test et**

Başarılı sonuç örneği:

```text
Bağlantı başarılı: MIC Market Gateway
```

## 5. Kullanım

- ABD hisse/ETF için bir varlık seç.
- **Grafik ve Sinyaller** bölümünü aç.
- `1 Saat` veya `4 Saat` seç.
- Kaynak etiketi `ALPACA_IEX` olarak görünür.
- Kripto için kaynak `CCXT_<BORSA>` olarak görünür.

## BIST sınırı

BIST 1 saatlik/4 saatlik veri, lisanslı Borsa İstanbul veri sağlayıcısı bağlanmadan açılmaz. Günlük mumdan sahte intraday mum üretilmez.

## Güvenlik

- Alpaca Secret Key'i GitHub'a commit etme.
- Alpaca Secret Key'i MIC tarayıcısına girme.
- `GATEWAY_ACCESS_TOKEN` değerini herkese açık paylaşma.
- Render ortam değişkenlerini **Secret** olarak sakla.
