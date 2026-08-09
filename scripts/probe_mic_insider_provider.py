import json, pathlib, requests
url='https://api.ai-analytics.org/api/v1/sec/form-4/recent?limit=10'
r=requests.get(url,timeout=30,headers={'User-Agent':'MIC/1.0'})
print('STATUS',r.status_code)
print('CONTENT-TYPE',r.headers.get('content-type'))
r.raise_for_status()
data=r.json()
print('TOP TYPE',type(data).__name__)
if isinstance(data,dict):
    print('TOP KEYS',sorted(data.keys()))
    for key,value in data.items():
        if isinstance(value,list) and value:
            print('LIST KEY',key,'COUNT',len(value))
            print('FIRST',json.dumps(value[0],ensure_ascii=False)[:5000])
            break
elif isinstance(data,list) and data:
    print('COUNT',len(data));print('FIRST',json.dumps(data[0],ensure_ascii=False)[:5000])
out=pathlib.Path('mic/data/insider/provider_probe.json');out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n','utf-8')
