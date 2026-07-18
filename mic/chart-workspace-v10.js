/* Compatibility loader: existing MIC pages are upgraded to MIC v16. */
(() => {
  if (window.__MIC_V16_LOADING) return;
  window.__MIC_V16_LOADING = true;
  const desktop=location.pathname.includes('mic-desktop');
  const base=desktop?'../mic/':'';
  const sub=document.querySelector('.top .sub');
  if(sub)sub.textContent=desktop?'Laptop web · yatırım karar desteği · v16':'Mobil yatırım karar desteği · v16';
  document.title=desktop?'MIC Laptop Web Beta v16':'MIC Mobile Beta v16';
  if('serviceWorker' in navigator&&!desktop)navigator.serviceWorker.register('sw.js?v=16').catch(()=>{});
  const addCss=href=>{if(document.querySelector(`link[href*="${href.split('?')[0]}"]`))return;const x=document.createElement('link');x.rel='stylesheet';x.href=base+href;document.head.appendChild(x)};
  const addScript=(src,onload)=>{if(document.querySelector(`script[src*="${src.split('?')[0]}"]`)){onload?.();return}const x=document.createElement('script');x.src=base+src;if(onload)x.onload=onload;document.body.appendChild(x)};
  addCss('chart-workspace-v13.css?v=16');
  addCss('chart-stability-v16.css?v=16');
  addCss('profile-risk-v14.css?v=16');
  addScript('asset-catalog-v15.js?v=16');
  addScript('profile-risk-v14.js?v=16');
  addScript('indicators-v13-patch.js?v=16',()=>
    addScript('chart-workspace-v13.js?v=16',()=>
      addScript('chart-stability-v16.js?v=16')));
})();