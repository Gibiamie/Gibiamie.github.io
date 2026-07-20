/* Compatibility loader: existing MIC pages are upgraded to MIC v24. */
(() => {
  if (window.__MIC_V24_LOADING) return;
  window.__MIC_V24_LOADING = true;
  const desktop=location.pathname.includes('mic-desktop');
  const base=desktop?'../mic/':'';
  const sub=document.querySelector('.top .sub');
  if(sub)sub.textContent=desktop?'Laptop web · yatırım karar desteği · v24':'Mobil yatırım karar desteği · v24';
  document.title=desktop?'MIC Laptop Web Beta v24':'MIC Mobile Beta v24';
  if('serviceWorker' in navigator&&!desktop)navigator.serviceWorker.register('sw.js?v=24').catch(()=>{});
  const addCss=href=>{if(document.querySelector(`link[href*="${href.split('?')[0]}"]`))return;const x=document.createElement('link');x.rel='stylesheet';x.href=base+href;document.head.appendChild(x)};
  const addScript=(src,onload)=>{if(document.querySelector(`script[src*="${src.split('?')[0]}"]`)){onload?.();return}const x=document.createElement('script');x.src=base+src;if(onload)x.onload=onload;document.body.appendChild(x)};
  addCss('chart-workspace-v13.css?v=24');
  addCss('chart-stability-v16.css?v=24');
  addCss('profile-risk-v14.css?v=24');
  addCss('quality-fixes-v17.css?v=24');
  addCss('price-integrity-v18.css?v=24');
  addCss('gateway-tutorial-v19.css?v=24');
  addCss('catalog-ui-v20.css?v=24');
  addScript('asset-catalog-v15.js?v=24',()=>addScript('catalog-ui-v20.js?v=24',()=>addScript('crypto-quotes-v22.js?v=24')));
  addScript('profile-risk-v14.js?v=24');
  addScript('indicators-v13-patch.js?v=24',()=>
    addScript('chart-workspace-v13.js?v=24',()=>
      addScript('chart-stability-v16.js?v=24',()=>
        addScript('quality-fixes-v17.js?v=24',()=>
          addScript('price-integrity-v18.js?v=24',()=>
            addScript('gateway-tutorial-v19.js?v=24',()=>
              addScript('crypto-history-v23.js?v=24',()=>
                addScript('product-language-v23.js?v=24'))))))));
})();
