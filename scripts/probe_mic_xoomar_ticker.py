import json,pathlib,requests
u='https://xoomar.com/api/markets/insiders/BRVE'
r=requests.get(u,timeout=30,headers={'User-Agent':'MIC/1.0 (+https://gibiamie.github.io/mic/)'})
print('STATUS',r.status_code);r.raise_for_status();j=r.json();print(json.dumps(j,ensure_ascii=False)[:20000]);p=pathlib.Path('mic/data/insider/xoomar_ticker_probe.json');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n','utf-8')
