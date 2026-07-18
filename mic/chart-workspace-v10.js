/* Compatibility loader: existing MIC pages are upgraded to MIC v20. */
(() => {
  if (window.__MIC_V20_LOADING) return;
  window.__MIC_V20_LOADING = true;
  const desktop=location.pathname.includes('mic-desktop');
  const base=desktop?'../mic/':'';
  const sub=document.querySelector('.top .sub');
  if(sub)sub.textContent=desktop?'Laptop web · yatırım karar desteği · v20':'Mobil yatırım karar desteği · v20';
  document.title=desktop?'MIC Laptop Web Beta v20':'MIC Mobile Beta v20';
  if('serviceWorker' in navigator&&!desktop)navigator.serviceWorker.register('sw.js?v=20').catch(()=>{});
  const addCss=href=>{if(document.querySelector(`link[href*="${href.split('?')[0]}"]`))return;const x=document.createElement('link');x.rel='stylesheet';x.href=base+href;document.head.appendChild(x)};
  const addScript=(src,onload)=>{if(document.querySelector(`script[src*="${src.split('?')[0]}"]`)){onload?.();return}const x=document.createElement('script');x.src=base+src;if(onload)x.onload=onload;document.body.appendChild(x)};
  addCss('chart-workspace-v13.css?v=20');
  addCss('chart-stability-v16.css?v=20');
  addCss('profile-risk-v14.css?v=20');
  addCss('quality-fixes-v17.css?v=20');
  addCss('price-integrity-v18.css?v=20');
  addCss('gateway-tutorial-v19.css?v=20');
  addCss('catalog-ui-v20.css?v=20');
  addScript('asset-catalog-v15.js?v=20',()=>addScript('catalog-ui-v20.js?v=20'));
  addScript('profile-risk-v14.js?v=20');
  addScript('indicators-v13-patch.js?v=20',()=>
    addScript('chart-workspace-v13.js?v=20',()=>
      addScript('chart-stability-v16.js?v=20',()=>
        addScript('quality-fixes-v17.js?v=20',()=>
          addScript('price-integrity-v18.js?v=20',()=>
            addScript('gateway-tutorial-v19.js?v=20'))))));
})();