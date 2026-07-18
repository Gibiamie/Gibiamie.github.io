(() => {
  const POLICY={
    version:'DG-11',
    bist:{market:'BIST',intraday:'disabled',provider:'LICENSED_VENDOR_REQUIRED',publicUse:false,label:'Lisanslı sağlayıcı gerekli'},
    us:{market:'US',intraday:'backend_required',provider:'ALPACA_IEX_BASIC',publicUse:'partner_terms_required',label:'Sunucu bağlantısı gerekli'},
    crypto:{market:'CRYPTO',intraday:'backend_required',provider:'CCXT_EXCHANGE_API',publicUse:'exchange_terms_apply',label:'Sunucu bağlantısı gerekli'}
  };
  window.MIC_DATA_POLICY=POLICY;

  function addCard(){
    const settings=document.getElementById('settings');
    if(!settings||document.getElementById('dataGovernanceCard'))return;
    const cards=settings.querySelectorAll('.card');
    const card=document.createElement('div');
    card.id='dataGovernanceCard';card.className='card dataGovernanceCard';
    card.innerHTML=`
      <div class="section"><div><h3>Veri Kaynağı ve Lisans Durumu</h3><span class="source">RM-CHG-03 · profesyonel veri uyumluluk kapısı</span></div><span class="badge">DG-11</span></div>
      <p class="muted">MIC, veri sağlayıcı lisansı ve kullanım şartları doğrulanmadan herkese açık 1 saatlik/4 saatlik veriyi etkinleştirmez. API anahtarları tarayıcıya yazılmaz.</p>
      <div class="providerGrid">
        <div class="providerItem">
          <div class="providerTop"><strong>BIST</strong><span class="providerStatus blocked">INTRADAY KAPALI</span></div>
          <div class="providerMeta"><span><b>Planlanan kaynak:</b> Borsa İstanbul lisanslı dağıtıcı/alt dağıtıcı</span><span><b>1s/4s:</b> Lisans ve sözleşme tamamlanana kadar sunulmaz</span><span><b>tvDatafeed:</b> Herkese açık ürün kaynağı olarak kullanılmaz</span></div>
        </div>
        <div class="providerItem">
          <div class="providerTop"><strong>ABD Hisse & ETF</strong><span class="providerStatus pending">BACKEND BEKLİYOR</span></div>
          <div class="providerMeta"><span><b>Beta kaynağı:</b> Alpaca Basic / IEX</span><span><b>Ücretsiz sınır:</b> Bütün ABD piyasası değil; IEX kapsamı</span><span><b>Anahtar:</b> Yalnızca sunucuda çevresel değişken</span></div>
        </div>
        <div class="providerItem">
          <div class="providerTop"><strong>Kripto</strong><span class="providerStatus pending">BACKEND BEKLİYOR</span></div>
          <div class="providerMeta"><span><b>Planlanan kaynak:</b> CCXT üzerinden borsa OHLCV</span><span><b>1s/4s:</b> Borsanın doğal mumları; yoksa gerçek 1s mumlardan 4s toplama</span><span><b>Koşul:</b> Borsa kullanım şartları ve oran limitleri</span></div>
        </div>
      </div>
      <div class="dataPolicyNotice"><strong>Profesyonel kullanım kuralı:</strong> Kullanıcıya gösterilen her veri <b>HAM SAĞLAYICI VERİSİ</b>, <b>1 SAATLİK VERİDEN TOPLULAŞTIRILMIŞ</b>, <b>HESAPLANMIŞ GÖSTERGE</b> veya <b>MODEL KARARI</b> olarak sınıflandırılır. Günlük mumdan 1s/4s üretmek yasaktır.</div>
      <div class="dataClassLegend"><span>PROVIDER_NATIVE_BAR</span><span>AGGREGATED_FROM_1H</span><span>CALCULATED_INDICATOR</span><span>MODEL_DECISION</span></div>
      <div class="marketGatewayBadge"><i></i><span>MIC Market Gateway kodu hazır; canlı sunucu dağıtımı yapılmadı</span></div>`;
    if(cards.length)cards[0].insertAdjacentElement('beforebegin',card);else settings.appendChild(card);
  }

  function annotateChart(){
    const info=document.getElementById('chartInfo');
    if(!info||document.getElementById('chartComplianceNote'))return;
    const note=document.createElement('div');note.id='chartComplianceNote';note.className='marketGatewayBadge';
    note.innerHTML='<i></i><span>1s/4s yalnızca lisanslı veya şartları doğrulanmış sunucu sağlayıcısından açılır</span>';
    info.parentElement?.appendChild(note);
  }

  function boot(){addCard();annotateChart();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  const observer=new MutationObserver(boot);observer.observe(document.body,{childList:true,subtree:true});
})();
