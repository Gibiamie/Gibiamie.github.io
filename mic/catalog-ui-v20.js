/* MIC v20 — multi-asset search and title corrections */
(() => {
  if (window.__MIC_CATALOG_UI_V20) return;
  window.__MIC_CATALOG_UI_V20 = true;

  function correctCommitteeTitle(){
    document.querySelectorAll('.sideTitle').forEach(el=>{
      el.textContent='MIC Investment Committee';
      el.setAttribute('aria-label','MIC Investment Committee');
    });
  }

  function normalizeText(value){
    return String(value||'')
      .toLocaleUpperCase('tr-TR')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'');
  }

  const baseSearchMatches=window.searchMatches;
  window.searchMatches=function(asset,query){
    if(typeof baseSearchMatches==='function'&&baseSearchMatches(asset,query))return true;
    const aliases=Array.isArray(asset?.search_aliases)?asset.search_aliases.join(' '):'';
    const haystack=normalizeText(`${asset?.symbol||''} ${asset?.name||''} ${asset?.provider_symbol||''} ${aliases}`);
    const clean=normalizeText(query).replace(/[—–-]/g,' ');
    const terms=clean.split(/\s+/).filter(Boolean);
    return terms.length>0&&terms.every(term=>haystack.includes(term));
  };

  function refreshSearch(){
    correctCommitteeTitle();
    if(typeof runSearch==='function')runSearch();
  }

  correctCommitteeTitle();
  document.addEventListener('mic:asset-catalog-ready',refreshSearch);
  const observer=new MutationObserver(correctCommitteeTitle);
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(refreshSearch,0);
})();
