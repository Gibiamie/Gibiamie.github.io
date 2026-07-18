/* MIC supplemental multi-asset catalog loader.
 * Prevents non-BIST symbols from disappearing when the periodic BIST refresh runs.
 */
(() => {
  if (window.__MIC_ASSET_CATALOG_V15) return;
  window.__MIC_ASSET_CATALOG_V15 = true;

  const desktop=location.pathname.includes('mic-desktop');
  const base=desktop?'../mic/':'';
  const keyOf=a=>String(a.type||'').toLowerCase()==='crypto'
    ? `CRYPTO:${String(a.symbol||'').toUpperCase()}`
    : `${String(a.exchange||'').toUpperCase()}:${String(a.symbol||'').toUpperCase()}`;

  function mergeAssets(primary, supplemental){
    const merged=new Map();
    (primary||[]).forEach(a=>merged.set(keyOf(a),a));
    (supplemental||[]).forEach(s=>{
      const key=keyOf(s),current=merged.get(key)||{};
      merged.set(key,{...s,...current,
        symbol:current.symbol||s.symbol,
        name:current.name||s.name,
        type:current.type||s.type,
        exchange:current.exchange||s.exchange,
        currency:current.currency||s.currency,
        provider_symbol:current.provider_symbol||s.provider_symbol,
        search_aliases:[...new Set([...(s.search_aliases||[]),...(current.search_aliases||[])])],
        history:Array.isArray(current.history)&&current.history.length?current.history:(s.history||[]),
        performance:Object.keys(current.performance||{}).length?current.performance:(s.performance||{})
      });
    });
    return [...merged.values()];
  }

  async function applySupplementalCatalog(){
    try{
      const response=await fetch(base+'data/supplemental-assets.json?t='+Date.now(),{cache:'no-store'});
      if(!response.ok)throw new Error('HTTP '+response.status);
      const catalog=await response.json();
      market.assets=mergeAssets(market.assets,catalog.assets);
      const status=$('settingsStatus');
      if(status)status.textContent=`${market.assets.length} varlık yüklendi; tamamlayıcı ETF ve kripto kataloğu aktif.`;
      if(typeof runSearch==='function')runSearch();
      if(typeof renderPortfolio==='function')renderPortfolio();
      window.MIC_ASSET_CATALOG_STATUS={ok:true,count:catalog.assets?.length||0,updated_at:catalog.updated_at};
      document.dispatchEvent(new CustomEvent('mic:asset-catalog-ready',{detail:window.MIC_ASSET_CATALOG_STATUS}));
      return true;
    }catch(error){
      window.MIC_ASSET_CATALOG_STATUS={ok:false,error:error.message};
      console.error('MIC supplemental asset catalog could not be loaded',error);
      return false;
    }
  }

  const originalLoadMarket=window.loadMarket;
  if(typeof originalLoadMarket==='function'){
    window.loadMarket=async function(){
      const result=await originalLoadMarket.apply(this,arguments);
      await applySupplementalCatalog();
      return result;
    };
  }

  setTimeout(applySupplementalCatalog,0);
})();