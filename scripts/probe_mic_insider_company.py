import json,pathlib,requests
symbols=['JEF','TYG','CBIO','ENR']
out={}
for s in symbols:
 u=f'https://api.ai-analytics.org/api/v1/sec/companies/{s}/insider-transactions?since=2026-07-01&limit=50'
 r=requests.get(u,timeout=30,headers={'User-Agent':'MIC/1.0'});print('URL',u,'STATUS',r.status_code);r.raise_for_status();j=r.json();print(s,json.dumps(j,ensure_ascii=False)[:10000]);out[s]=j
p=pathlib.Path('mic/data/insider/provider_company_probe.json');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf-8')
