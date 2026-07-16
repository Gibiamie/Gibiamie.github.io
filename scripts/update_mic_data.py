from __future__ import annotations
import json, math
from datetime import datetime, timezone
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'mic' / 'data' / 'market.json'
COLS = ['name','description','type','subtype','close','change','volume','market_cap_basic','price_earnings_ttm','return_on_equity','revenue_growth_ttm_yoy','Volatility.D','sector','industry','currency','Perf.W','Perf.1M','Perf.3M','Perf.6M','Perf.Y','Perf.YTD']

def f(v):
    try:
        x=float(v); return x if math.isfinite(x) else None
    except (TypeError,ValueError): return None

def main():
    old=json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {'assets':[],'fx':{'USDTRY':40}}
    old_by_key={(a.get('exchange'),a.get('symbol')):a for a in old.get('assets',[])}
    payload={'filter':[{'left':'exchange','operation':'equal','right':'BIST'}],'options':{'lang':'tr'},'symbols':{'query':{'types':[]},'tickers':[]},'columns':COLS,'sort':{'sortBy':'market_cap_basic','sortOrder':'desc'},'range':[0,1000]}
    r=requests.post('https://scanner.tradingview.com/turkey/scan',json=payload,headers={'User-Agent':'Mozilla/5.0'},timeout=45); r.raise_for_status()
    assets=[]
    for row in r.json().get('data',[]):
        d=row.get('d') or []
        if len(d)<len(COLS): continue
        x=dict(zip(COLS,d)); symbol=str(x.get('name') or row.get('s','').split(':')[-1]).upper().strip()
        subtype=str(x.get('subtype') or '').lower(); typ='etf' if 'etf' in subtype or str(x.get('type')).lower()=='fund' else 'stock'
        if not symbol: continue
        previous=old_by_key.get(('BIST',symbol),{})
        assets.append({'symbol':symbol,'name':str(x.get('description') or symbol),'type':typ,'exchange':'BIST','currency':str(x.get('currency') or 'TRY').upper(),'price':f(x.get('close')),'change':f(x.get('change')),'volume':f(x.get('volume')),'market_cap':f(x.get('market_cap_basic')),'pe':f(x.get('price_earnings_ttm')),'roe':f(x.get('return_on_equity')),'revenue_growth':f(x.get('revenue_growth_ttm_yoy')),'volatility':f(x.get('Volatility.D')),'sector':x.get('sector'),'industry':x.get('industry'),'history':previous.get('history',[]),'history_updated_at':previous.get('history_updated_at'),'performance':{'1H':f(x.get('Perf.W')),'1A':f(x.get('Perf.1M')),'3A':f(x.get('Perf.3M')),'6A':f(x.get('Perf.6M')),'1Y':f(x.get('Perf.Y')),'YTD':f(x.get('Perf.YTD'))}})
    assets += [a for a in old.get('assets',[]) if a.get('exchange')!='BIST']
    out={'updated_at':datetime.now(timezone.utc).isoformat(timespec='seconds'),'source':'BIST snapshot and performance feed; GitHub Actions periodic refresh','fx':old.get('fx',{'USDTRY':40}),'assets':assets}
    OUT.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(f'wrote {len(assets)} assets')
if __name__=='__main__': main()
