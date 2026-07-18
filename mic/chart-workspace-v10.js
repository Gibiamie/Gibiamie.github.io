/* Compatibility loader: existing MIC pages are upgraded to MIC v17. */
(() => {
  if (window.__MIC_V17_LOADING) return;
  window.__MIC_V17_LOADING = true;
  const desktop=location.pathname.includes('mic-desktop');
  const base=desktop?'../mic/':'';
  const sub=document.querySelector('.top .sub');
  if(sub)sub.textContent=desktop?'Laptop web · yatırım karar desteği · v17':'Mobil yatırım karar desteği · v17';
  document.title=desktop?'MIC Laptop Web Beta v17':'MIC Mobile Beta v17';
  if('serviceWorker' in navigator&&!desktop)navigator.serviceWorker.register('sw.js?v=17').catch(()=>{});
  const addCss=href=>{if(document.querySelector(`link[href*="${href.split('?')[0]}"]`))return;const x=document.createElement('link');x.rel='stylesheet';x.href=base+href;document.head.appendChild(x)};
  const addScript=(src,onload)=>{if(document.querySelector(`script[src*="${src.split('?')[0]}"]`)){onload?.();return}const x=document.createElement('script');x.src=base+src;if(onload)x.onload=onload;document.body.appendChild(x)};
  addCss('chart-workspace-v13.css?v=17');
  addCss('chart-stability-v16.css?v=17');
  addCss('profile-risk-v14.css?v=17');
  addCss('quality-fixes-v17.css?v=17');
  addScript('asset-catalog-v15.js?v=17');
  addScript('profile-risk-v14.js?v=17');
  addScript('indicators-v13-patch.js?v=17',()=>
    addScript('chart-workspace-v13.js?v=17',()=>
      addScript('chart-stability-v16.js?v=17',()=>
        addScript('quality-fixes-v17.js?v=17'))));
})();
