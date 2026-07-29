(()=>{'use strict';
if(window.__MIC_MACRO_V30)return;window.__MIC_MACRO_V30=true;
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(v,d=2)=>Number.isFinite(+v)?(+v).toLocaleString('tr-TR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
let data=null,active=false,loading=false;
const signalMeta={
  pressure:{label:'BASKI',cls:'r',weight:2},
  caution:{label:'TEMKİN',cls:'w',weight:1},
  neutral:{label:'NÖTR',cls:'',weight:0},
  support:{label:'DESTEK',cls:'g',weight:-1}
};
function safeUrl(value){try{const u=new URL(String(value||''));return /^https?:$/.test(u.protocol)?u.href:'#'}catch{return'#'}}
function badge(text,cls=''){return`<span class="macro30badge ${cls}">${esc(text)}</span>`}
function score(){
  const total=(data?.items||[]).reduce((sum,item)=>sum+(signalMeta[item.signal]?.weight||0),0);
  if(total>=5)return{value:total,label:'YÜKSEK MAKRO BASKI',cls:'r',comment:'Teknik kurulum olsa bile pozisyon boyutu ve teyit şartları sıkılaştırılmalı.'};
  if(total>=1)return{value:total,label:'TEMKİNLİ / SEÇİCİ',cls:'w',comment:'Panik rejimi yok; fakat küresel faiz ve dolar koşulları seçici olmayı gerektiriyor.'};
  return{value:total,label:'MAKRO BASKI SINIRLI',cls:'g',comment:'Makro ortam teknik kurulumları engellemiyor; yine de teyit ve risk limiti zorunlu.'};
}
function dateLabel(value){
  const d=new Date(value);return Number.isNaN(d.getTime())?esc(value):d.toLocaleDateString('tr-TR',{day:'2-digit',month:'short',year:'numeric'});
}
function sources(item){
  return(item.sources||[]).map(s=>`<a href="${safeUrl(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.label||'Kaynak')}</a>`).join('');
}
function card(item){
  const meta=signalMeta[item.signal]||signalMeta.neutral;
  return`<article class="card macro30item ${meta.cls}">
    <div class="macro30top"><div><span class="source">${esc(item.label)}</span><h2>${fmt(item.value,2)}${esc(item.unit||'')}</h2></div>${badge(meta.label,meta.cls)}</div>
    <div class="macro30change">${esc(item.change_label||'')} · ${dateLabel(item.as_of)}</div>
    <p><b>${esc(item.short||'')}</b></p>
    <p class="muted">${esc(item.detail||'')}</p>
    <div class="macro30sources">${sources(item)}</div>
  </article>`;
}
function render(){
  const root=$('tm27content');if(!root||!active)return;
  if(loading){root.innerHTML='<div class="card empty">Makro veriler yükleniyor…</div>';return}
  if(!data){root.innerHTML='<div class="card empty">Makro veri alınamadı. Yeniden deneyin.</div>';return}
  const s=score(),updated=new Date(data.updated_at);
  root.innerHTML=`<div id="macro30root">
    <div class="card macro30hero">
      <div><span class="source">${esc(data.market)} · İşlem öncesi bağlam</span><h2>${esc(s.label)}</h2><p>${esc(s.comment)}</p></div>
      <div class="macro30score ${s.cls}">${s.value}<small>net baskı</small></div>
    </div>
    <div class="macro30fresh"><span>Doğrulama: ${Number.isNaN(updated.getTime())?esc(data.updated_at):updated.toLocaleString('tr-TR')}</span><button id="macro30refresh" class="ghost" type="button">Yenile</button></div>
    <div class="macro30grid">${(data.items||[]).map(card).join('')}</div>
    <div class="card macro30order">
      <h3>Sabah kontrol sırası</h3>
      <ol><li>TCMB kararını ve mesaj değişimini kontrol et.</li><li>ABD 10 yıllık tahvilin seviyesine ve yönüne bak.</li><li>DXY ile dolar talebini kontrol et.</li><li>VIX ile panik/oynaklık rejimini kontrol et.</li><li>Ancak bundan sonra Piyasa Filtresi ve teknik kurulumlara geç.</li></ol>
    </div>
    <div class="card macro30events"><h3>Yaklaşan doğrulama noktaları</h3>${(data.next_events||[]).map(e=>`<div><b>${dateLabel(e.date)}</b><span>${esc(e.label)}</span></div>`).join('')}</div>
    <div class="macro30warning"><b>Kritik düzeltme:</b> Bu dört gösterge hisse fiyatını tek başına belirlemez. Aynı gün farklı sektörler ve hisseler farklı tepki verebilir. Ekran yalnızca risk ortamını sınıflandırır.</div>
    <div class="macro30disc">${esc(data.disclaimer||'')}</div>
  </div>`;
  $('macro30refresh')?.addEventListener('click',()=>load(true));
}
async function load(force=false){
  if(loading)return;
  if(data&&!force){render();return}
  loading=true;render();
  try{
    const r=await fetch(`data/macro-context.json?t=${Date.now()}`,{cache:'no-store'});
    const j=await r.json();
    if(!r.ok||!Array.isArray(j.items))throw Error('Geçersiz makro veri');
    data=j;
  }catch(error){data=null}
  loading=false;render();
}
function activate(){
  active=true;
  document.querySelectorAll('[data-tm27],[data-fakeout],[data-v29]').forEach(x=>x.classList.remove('active'));
  document.querySelector('[data-macro-v30]')?.classList.add('active');
  load(false);
}
function deactivate(){active=false;document.querySelector('[data-macro-v30]')?.classList.remove('active')}
function addOverview(){
  const grid=$('tm27content')?.querySelector('.tm27grid');
  if(!grid||grid.querySelector('[data-macro-card]'))return;
  const b=document.createElement('button');b.dataset.macroCard='1';
  b.innerHTML='<b>◉</b><strong>Sabah Makro Kontrolü</strong><small>TCMB · ABD 10Y · DXY · VIX</small>'+badge('Önce bunu aç','w');
  b.addEventListener('click',activate);
  grid.prepend(b);
}
function addHomeCard(){
  const home=$('home');if(!home||$('macro30home'))return;
  const card=document.createElement('div');card.id='macro30home';card.className='card macro30home';
  card.innerHTML='<div><span class="source">Sabah makro kontrolü · MIC v30</span><h3>Grafikten önce risk ortamını kontrol et.</h3><p class="muted">TCMB, ABD 10 yıllık, DXY ve VIX tek ekranda.</p></div><button class="ghost" type="button">Aç</button>';
  const first=home.querySelector('.hero');first?.insertAdjacentElement('afterend',card)||home.prepend(card);
  card.querySelector('button').addEventListener('click',()=>{typeof nav==='function'&&nav('methods');setTimeout(activate,0)});
}
function install(){
  const methods=$('methods'),tabs=methods?.querySelector('.tm27tabs'),content=$('tm27content');
  if(!methods||!tabs||!content)return false;
  let btn=tabs.querySelector('[data-macro-v30]');
  if(!btn){btn=document.createElement('button');btn.dataset.macroV30='1';btn.textContent='Makro';const home=tabs.querySelector('[data-tm27="home"]');home?.insertAdjacentElement('afterend',btn)||tabs.prepend(btn)}
  btn.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();activate()});
  methods.addEventListener('click',event=>{if(event.target.closest('[data-tm27],[data-fakeout],[data-v29]'))deactivate()},true);
  $('tm27sym')?.addEventListener('change',()=>{if(active)setTimeout(render,0)});
  const hero=methods.querySelector('.tm27hero h3');if(hero)hero.textContent='Önce makro bağlamı, sonra piyasa filtresi ve teknik yöntemleri kontrol et.';
  const obs=new MutationObserver(()=>{if(active&&!$('macro30root'))render();else if(!active)addOverview()});
  obs.observe(content,{childList:true,subtree:true});
  addOverview();addHomeCard();
  return true;
}
let tries=0,t=setInterval(()=>{if(install()||++tries>100)clearInterval(t)},100);
})();
