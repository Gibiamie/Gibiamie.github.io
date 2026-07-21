from __future__ import annotations
# MIC Nasdaq history rotation v25
import json
import math
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
CATALOG=ROOT/'mic'/'data'/'nasdaq-assets.json'
HISTORY_DIR=ROOT/'mic'/'data'/'history'
STATE_FILE=ROOT/'mic'/'data'/'nasdaq-history-state.json'
BATCH_SIZE=max(10,min(500,int(os.getenv('MIC_NASDAQ_HISTORY_BATCH','200'))))
WORKERS=max(2,min(16,int(os.getenv('MIC_NASDAQ_HISTORY_WORKERS','10'))))
HEADERS={
    'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/150 Safari/537.36',
    'Accept':'application/json,text/plain,*/*',
    'Accept-Language':'en-US,en;q=0.9',
    'Origin':'https://www.nasdaq.com',
    'Referer':'https://www.nasdaq.com/'
}
EXCLUDED={'Warrant','Right','Unit','Note','Bond'}


def number(value):
    if value is None:
        return None
    text=str(value).strip().replace('$','').replace(',','')
    if text in {'','N/A','n/a','--','-'}:
        return None
    try:
        n=float(text)
        return n if math.isfinite(n) else None
    except (TypeError,ValueError):
        return None


def iso_date(value):
    text=str(value or '').strip()
    for fmt in ('%m/%d/%Y','%Y-%m-%d'):
        try:return datetime.strptime(text,fmt).date().isoformat()
        except ValueError:pass
    return None


def eligible(asset):
    return asset.get('type')=='etf' or asset.get('instrument_class') not in EXCLUDED


def fetch_one(asset):
    symbol=str(asset.get('symbol') or '').upper()
    if not symbol or not re.fullmatch(r'[A-Z0-9.\-^]+',symbol):
        return symbol,None,'invalid symbol'
    assetclass='etf' if asset.get('type')=='etf' else 'stocks'
    end=date.today();start=end-timedelta(days=370)
    url=f'https://api.nasdaq.com/api/quote/{symbol}/historical'
    params={'assetclass':assetclass,'fromdate':start.strftime('%m/%d/%Y'),'todate':end.strftime('%m/%d/%Y'),'limit':'400'}
    error='no response'
    for attempt in range(3):
        try:
            r=requests.get(url,params=params,headers=HEADERS,timeout=35)
            r.raise_for_status()
            data=r.json().get('data') or {}
            rows=((data.get('tradesTable') or {}).get('rows') or [])
            history=[]
            for row in rows:
                day=iso_date(row.get('date'));close=number(row.get('close'))
                if not day or close is None:continue
                history.append({'date':day,'open':number(row.get('open')) or close,'high':number(row.get('high')) or close,'low':number(row.get('low')) or close,'close':close,'volume':number(row.get('volume')) or 0})
            history.sort(key=lambda x:x['date'])
            if len(history)<2:
                raise RuntimeError('insufficient history')
            payload={'symbol':symbol,'provider_symbol':symbol,'provider':'Nasdaq.com historical endpoint','updated_at':datetime.now(timezone.utc).isoformat(timespec='seconds'),'history':history}
            return symbol,payload,None
        except Exception as exc:
            error=str(exc)
    return symbol,None,error


def load_state():
    try:return json.loads(STATE_FILE.read_text(encoding='utf-8'))
    except Exception:return {'cursor':0,'cycles':0}


def main():
    catalog=json.loads(CATALOG.read_text(encoding='utf-8'))
    assets=[a for a in catalog.get('assets',[]) if eligible(a)]
    assets.sort(key=lambda a:a.get('symbol',''))
    if not assets:
        raise RuntimeError('Nasdaq catalog is empty')
    state=load_state();cursor=int(state.get('cursor') or 0)%len(assets)
    batch=[assets[(cursor+i)%len(assets)] for i in range(min(BATCH_SIZE,len(assets)))]
    HISTORY_DIR.mkdir(parents=True,exist_ok=True)
    successes=0;failures=[]
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        jobs={pool.submit(fetch_one,a):a for a in batch}
        for future in as_completed(jobs):
            symbol,payload,error=future.result()
            if payload:
                path=HISTORY_DIR/f'{symbol}.json'
                serialized=json.dumps(payload,ensure_ascii=False,separators=(',',':'))
                if not path.exists() or path.read_text(encoding='utf-8')!=serialized:
                    path.write_text(serialized,encoding='utf-8')
                successes+=1
            else:
                failures.append({'symbol':symbol,'error':error})
    next_cursor=(cursor+len(batch))%len(assets)
    cycles=int(state.get('cycles') or 0)+(1 if next_cursor<=cursor else 0)
    out={'cursor':next_cursor,'eligible_count':len(assets),'batch_size':len(batch),'last_run':datetime.now(timezone.utc).isoformat(timespec='seconds'),'last_success':successes,'last_failed':len(failures),'failed':failures[:50],'cycles':cycles}
    STATE_FILE.write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    print(f'Nasdaq history batch cursor={cursor}->{next_cursor}; success={successes}; failed={len(failures)}; eligible={len(assets)}')


if __name__=='__main__':
    main()
