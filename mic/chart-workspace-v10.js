/* Compatibility loader: existing MIC pages are upgraded to MIC v15. */
(() => {
  if (window.__MIC_V15_LOADING) return;
  window.__MIC_V15_LOADING = true;
  const desktop=location.pathname.includes('mic-desktop');
  const base=desktop?'../mic/':'';
  const sub=document.querySelector('.top .sub');
  if(sub)sub.textContent=desktop?'Laptop web · yatırım karar desteği · v15':'Mobil yatırım karar desteği · v15';
  document.title=desktop?'MIC Laptop Web Beta v15':'MIC Mobile Beta v15';
  if('serviceWorker' in navigator&&!desktop)navigator.serviceWorker.register('sw.js?v=15').catch(()=>{});
  const addCss=href=>{if(document.querySelector(`link[href*="${href.split('?')[0]}"]`))return;const x=document.createElement('link');x.rel='stylesheet';x.href=base+href;document.head.appendChild(x)};
  const addScript=(src,onload)=>{if(document.querySelector(`script[src*="${src.split('?')[0]}"]`)){onload?.();return}const x=document.createElement('script');x.src=base+src;if(onload)x.onload=onload;document.body.appendChild(x)};
  addCss('chart-workspace-v13.css?v=15');
  addCss('profile-risk-v14.css?v=15');
  addScript('asset-catalog-v15.js?v=15');
  addScript('profile-risk-v14.js?v=15');
  addScript('indicators-v13-patch.js?v=15',()=>addScript('chart-workspace-v13.js?v=15'));
})();