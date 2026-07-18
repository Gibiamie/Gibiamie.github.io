/* Compatibility loader: v10/v11/v12 pages are upgraded to the v13 workspace. */
(() => {
  if (window.__MIC_CHART_V13_LOADING) return;
  window.__MIC_CHART_V13_LOADING = true;
  const desktop=location.pathname.includes('mic-desktop');
  const base=desktop?'../mic/':'';
  const addCss=href=>{if(document.querySelector(`link[href*="${href.split('?')[0]}"]`))return;const x=document.createElement('link');x.rel='stylesheet';x.href=base+href;document.head.appendChild(x)};
  const addScript=(src,onload)=>{if(document.querySelector(`script[src*="${src.split('?')[0]}"]`)){onload?.();return}const x=document.createElement('script');x.src=base+src;if(onload)x.onload=onload;document.body.appendChild(x)};
  addCss('chart-workspace-v13.css?v=13');
  addScript('indicators-v13-patch.js?v=13',()=>addScript('chart-workspace-v13.js?v=13'));
})();
