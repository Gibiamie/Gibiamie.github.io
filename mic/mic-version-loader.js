/* Compatibility loader: existing MIC pages are upgraded to MIC v21. */
(() => {
  if (window.__MIC_V21_LOADING) return;
  window.__MIC_V21_LOADING = true;
  const desktop=location.pathname.includes('mic-desktop');
  const base=desktop?'../mic/':'';
  const sub=document.querySelector('.top .sub');
  if(sub)sub.textContent=desktop?'Laptop web · yatırım karar desteği · v21':'Mobil yatırım karar desteği · v21';
  document.title=desktop?'MIC Laptop Web Beta v21':'MIC Mobile Beta v21';
  if('serviceWorker' in navigator&&!desktop)navigator.serviceWorker.register('sw.js?v=21').catch(()=>{});
  const addCss=href=>{if(document.querySelector(`link[href*="${href.split('?')[0]}"]`))return;const x=document.createElement('link');x.rel='stylesheet';x.href=base+href;document.head.appendChild(x)};
  const addScript=(src,onload)=>{if(document.querySelector(`script[src*="${src.split('?')[0]}"]`)){onload?.();return}const x=document.createElement('script');x.src=base+src;if(onload)x.onload=onload;document.body.appendChild(x)};
  addCss('chart-workspace-v13.css?v=21');
  addCss('chart-stability-v16.css?v=21');
  addCss('profile-risk-v14.css?v=21');
  addCss('quality-fixes-v17.css?v=21');
  addCss('price-integrity-v18.css?v=21');
  addCss('gateway-tutorial-v19.css?v=21');
  addCss('catalog-ui-v20.css?v=21');
  addScript('asset-catalog-v15.js?v=21',()=>addScript('catalog-ui-v20.js?v=21'));
  addScript('profile-risk-v14.js?v=21');
  addScript('indicators-v13-patch.js?v=21',()=>
    addScript('chart-workspace-v13.js?v=21',()=>
      addScript('chart-stability-v16.js?v=21',()=>
        addScript('quality-fixes-v17.js?v=21',()=>
          addScript('price-integrity-v18.js?v=21',()=>
            addScript('gateway-tutorial-v19.js?v=21'))))));
})();