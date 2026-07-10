(async()=>{
  try {
    const files = ['bundle.part1.txt','bundle.part2.txt','bundle.part3.txt','bundle.part4.txt','bundle.part5.txt','bundle.part6.txt','bundle.part7.txt','bundle.part8.txt'];
    const parts = await Promise.all(files.map(async f => { const r = await fetch(f); if(!r.ok) throw new Error(f+" "+r.status); return r.text(); }));
    (0,eval)(parts.join(""));
  } catch (error) {
    console.error(error);
    const main=document.getElementById("mainContent");
    if(main) main.innerHTML='<section class="boot-message"><strong>FirstStep yüklenemedi.</strong><p>Sayfayı yenileyin. Sorun devam ederse tarayıcı önbelleğini temizleyin.</p></section>';
  }
})();
