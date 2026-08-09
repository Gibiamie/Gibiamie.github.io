import json,pathlib,requests
spec=requests.get('https://api.ai-analytics.org/openapi.json',timeout=30,headers={'User-Agent':'MIC/1.0'}).json()
paths=spec.get('paths',{})
matched={k:v for k,v in paths.items() if 'form-4' in k.lower() or 'insider' in k.lower()}
print('MATCHED PATHS',list(matched))
for k,v in matched.items():
    print('\nPATH',k)
    print(json.dumps(v,ensure_ascii=False)[:12000])
out=pathlib.Path('mic/data/insider/provider_openapi.json');out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(matched,ensure_ascii=False,indent=2)+'\n','utf-8')
