import json,pathlib,requests
urls=[
 'https://api.ai-analytics.org/api/v1/sec/insider-dashboard?days=30',
 'https://api.ai-analytics.org/api/v1/sec/insider-leaderboard?days=30&direction=buys&limit=50'
]
out={}
for u in urls:
 r=requests.get(u,timeout=30,headers={'User-Agent':'MIC/1.0'});print('URL',u,'STATUS',r.status_code);r.raise_for_status();j=r.json();print(json.dumps(j,ensure_ascii=False)[:18000]);out[u]=j
p=pathlib.Path('mic/data/insider/provider_dashboard_probe.json');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n','utf-8')
