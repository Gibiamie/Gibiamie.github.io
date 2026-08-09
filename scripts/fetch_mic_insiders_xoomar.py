from __future__ import annotations

import html, json, math, re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
import requests
import fetch_mic_insiders as base

API='https://xoomar.com/api/markets/insiders'
HEADERS={'User-Agent':'MIC Insider Conviction Scanner/1.0 (+https://gibiamie.github.io/mic/)'}
WINDOW_DAYS=30
DISPLAY_DAYS=10
CLUSTER_DAYS=10
MAX_DETAIL_TICKERS=45

ENTITY_WORDS=(' LLC',' L.P',' LP',' INC',' CORP',' CORPORATION',' FUND',' CAPITAL',' HOLDINGS',' INSURANCE',' FINANCIAL GROUP',' LTD',' PLC',' CO.',' COMPANY',' TRUST',' COOPERATIEF',' PARTNERS')

def get_json(url,timeout=35):
    r=requests.get(url,headers=HEADERS,timeout=timeout)
    if r.status_code==429:
        raise RuntimeError('Xoomar rate limit: retry later')
    r.raise_for_status();return r.json()

def f(v):
    try:
        x=float(v);return x if math.isfinite(x) else None
    except Exception:return None

def date_dt(s):
    try:return datetime.strptime(str(s),'%Y-%m-%d').replace(tzinfo=timezone.utc)
    except Exception:return None

def role_from_title(name,title):
    n=(name or '').upper();t=html.unescape(title or '').strip();u=t.upper()
    entity=any(w in ' '+n for w in ENTITY_WORDS)
    if 'CEO' in u or 'CHIEF EXECUTIVE' in u:return 'CEO / President',t,12,entity
    if 'CFO' in u or 'CHIEF FINANCIAL' in u:return 'CFO',t,12,entity
    if 'COO' in u or 'CHIEF OPERATING' in u:return 'COO',t,11,entity
    if 'PRESIDENT' in u and 'VICE' not in u:return 'President',t,11,entity
    if 'EXECUTIVE CHAIR' in u or 'CHAIRMAN' in u or u=='CHAIR':return 'Chair / Executive Chair',t,10,entity
    if any(k in u for k in ('CHIEF ','EVP','SVP','VICE PRESIDENT',' VP','GENERAL COUNSEL','TREASURER')):return 'Officer',t,9,entity
    if 'DIRECTOR' in u:return 'Director',t,8,entity
    if entity:return 'Entity / beneficial owner',t or None,3,True
    return 'Reporting person',t or None,3,False

def key(row):
    return '|'.join([str(row.get('ticker') or '').upper(),html.unescape(str(row.get('insiderName') or '')).strip().upper(),str(row.get('txDate') or ''),str(row.get('shares') or ''),str(row.get('pricePerShare') or '')])

def fetch_global():
    j=get_json(f'{API}?type=buys&window={WINDOW_DAYS}d')
    rows=j.get('data',[]) if isinstance(j,dict) else []
    updated=j.get('updatedAt') if isinstance(j,dict) else None
    return rows,updated

def prelim(rows):
    by=defaultdict(list)
    for r in rows:
        t=str(r.get('ticker') or '').strip().upper()
        if t and t not in {'N/A','NONE','NULL'}:by[t].append(r)
    ranked=[]
    for t,rr in by.items():
        distinct={html.unescape(str(x.get('insiderName') or '')).strip().upper() for x in rr if x.get('insiderName')}
        total=sum(f(x.get('valueUsd')) or 0 for x in rr)
        important=sum(1 for x in rr if role_from_title(x.get('insiderName'),x.get('insiderTitle'))[2]>=8)
        maxv=max([f(x.get('valueUsd')) or 0 for x in rr] or [0])
        score=(len(distinct)*2)+(important*4)+math.log10(max(total,1))+math.log10(max(maxv,1))
        if maxv>=10_000 or important or len(distinct)>=2:ranked.append((score,t))
    ranked.sort(reverse=True)
    return [t for _,t in ranked[:MAX_DETAIL_TICKERS]]

def fetch_detail(ticker):
    j=get_json(f'{API}/{ticker}')
    data=j.get('data',{}) if isinstance(j,dict) else {}
    return data.get('transactions',[]) if isinstance(data,dict) else [],j.get('updatedAt') if isinstance(j,dict) else None

def same(a,b):
    if str(b.get('txCode') or '').upper()!='P' or b.get('isOpenMarket') is not True:return False
    if html.unescape(str(a.get('insiderName') or '')).strip().upper()!=html.unescape(str(b.get('insiderName') or '')).strip().upper():return False
    if str(a.get('txDate') or '')!=str(b.get('txDate') or ''):return False
    sa,sb=f(a.get('shares')),f(b.get('shares'));pa,pb=f(a.get('pricePerShare')),f(b.get('pricePerShare'))
    return sa is not None and sb is not None and abs(sa-sb)<=max(.01,abs(sa)*1e-6) and pa is not None and pb is not None and abs(pa-pb)<=max(.0001,abs(pa)*1e-6)

def placement_flags(rows):
    flags=set(); groups=defaultdict(list)
    for r in rows:
        t=str(r.get('ticker') or '').strip().upper();d=str(r.get('txDate') or '');p=f(r.get('pricePerShare'))
        if t and d and p is not None:groups[(t,d,round(p,3))].append(r)
    for _,rr in groups.items():
        names={html.unescape(str(x.get('insiderName') or '')).strip().upper() for x in rr}
        total=sum(f(x.get('valueUsd')) or 0 for x in rr)
        if len(names)>=3 and total>=500_000:
            for x in rr:flags.add(key(x))
    return flags

def make_events(global_rows,detail_map,existing):
    old={e.get('source_key'):e for e in existing if e.get('source_key')};placement=placement_flags(global_rows);events=[]
    for r in global_rows:
        ticker=str(r.get('ticker') or '').strip().upper()
        if not ticker or ticker in {'N/A','NONE','NULL'}:continue
        shares,price,value=f(r.get('shares')),f(r.get('pricePerShare')),f(r.get('valueUsd'))
        if not shares or shares<=0 or not price or price<=0:continue
        if value is None:value=shares*price
        name=html.unescape(str(r.get('insiderName') or '')).strip();role,title,role_points,is_entity=role_from_title(name,r.get('insiderTitle'))
        source_key=key(r);detail=None
        for d in detail_map.get(ticker,[]):
            if same(r,d):detail=d;break
        post=f(detail.get('sharesOwnedAfter')) if detail else None
        prior=post-shares if post is not None else None
        newpos=bool(post is not None and prior is not None and prior<=max(.01,shares*.000001))
        increase=(shares/prior*100) if prior is not None and prior>0 else None
        e=old.get(source_key,{}).copy();e.update({'id':'xoomar:'+source_key,'source_key':source_key,'accession':None,'ticker':ticker,'issuer':ticker,'issuer_cik':None,'insider':name,'insider_cik':name,'role':role,'officer_title':title,'role_points':role_points,'is_entity':is_entity,'transaction_date':str(r.get('txDate') or ''),'filed_at':None,'shares':round(shares,4),'avg_price':round(price,6),'value_usd':round(value,2),'post_shares':round(post,4) if post is not None else None,'prior_shares_est':round(prior,4) if prior is not None else None,'position_increase_pct':round(increase,2) if increase is not None else None,'new_position':newpos,'transaction_count':1,'source_url':f'https://xoomar.com/markets/insiders/{ticker.lower()}','sec_url':f'https://xoomar.com/markets/insiders/{ticker.lower()}','source_rule':'Xoomar SEC-derived Form 4: txCode=P and isOpenMarket=true','discovery_source':'Xoomar','freshness_basis':'transaction_date_proxy','possible_private_placement':source_key in placement})
        events.append(e)
    return events

def cluster_stats(events,event):
    d=date_dt(event.get('transaction_date'));t=event.get('ticker')
    if not d:return 1,0,1,False
    peers=[e for e in events if e.get('ticker')==t and (date_dt(e.get('transaction_date')) is not None) and abs((d-date_dt(e.get('transaction_date'))).days)<=CLUSTER_DAYS]
    distinct={e.get('insider') for e in peers if e.get('insider')};management={e.get('insider') for e in peers if e.get('insider') and int(e.get('role_points') or 0)>=8 and not e.get('is_entity')}
    value=sum(float(e.get('value_usd') or 0) for e in peers)
    placement=sum(1 for e in peers if e.get('possible_private_placement'))>=max(2,len(peers)//2)
    return len(distinct),value,len(management),placement

def cluster_points(total,management,placement):
    if management>=4:return 14
    if management==3:return 12
    if management==2:return 9
    if placement:return 2 if total>=3 else 0
    if total>=4:return 6
    if total==3:return 5
    if total==2:return 3
    return 0

def recency_points(hours):
    # Xoomar exposes transaction date but not SEC acceptance timestamp. Keep the
    # maximum below the official-filing version's 10/10 so the score cannot imply
    # precision we do not have.
    if hours is None:return None
    if hours<=48:return 7
    if hours<=96:return 6
    if hours<=168:return 5
    if hours<=240:return 3
    if hours<=360:return 1
    return 0

def score(e,m,events,now):
    d=date_dt(e.get('transaction_date'));age=max(0,(now-d).total_seconds()/3600) if d else None
    total,cluster_value,management,placement=cluster_stats(events,e)
    components={
      'insider_role':{'points':int(e.get('role_points') or 0),'max':12},
      'purchase_value':{'points':base.points_value(float(e.get('value_usd') or 0)),'max':15},
      'position_increase':{'points':base.points_position(e) if e.get('post_shares') is not None else None,'max':12},
      'cluster_buying':{'points':cluster_points(total,management,placement),'max':14},
      'filing_freshness':{'points':recency_points(age),'max':10,'proxy':True},
      'market_cap':{'points':base.points_market_cap(m.get('market_cap')),'max':7},
      'dollar_volume':{'points':base.points_dollar_volume(m.get('avg_dollar_volume_20d')),'max':8},
      'spread':{'points':base.points_spread(m.get('spread_pct')),'max':5},
      'short_interest':{'points':base.points_short(m.get('short_float_pct')),'max':5},
      'trend':{'points':({'bullish':6,'neutral':3,'bearish':0}.get(m.get('trend')) if m.get('trend') else None),'max':6},
      'technical_confirmation':{'points':({'confirmed':6,'watch':3,'unconfirmed':0}.get(m.get('technical_confirmation')) if m.get('technical_confirmation') else None),'max':6}
    }
    available=sum(x['max'] for x in components.values() if x['points'] is not None);earned=sum(x['points'] for x in components.values() if x['points'] is not None)
    normalized=round(earned/available*100) if available else 0
    # Precise filing timestamp is unavailable from this keyless source; reflect this
    # in completeness instead of pretending the transaction date is the disclosure time.
    completeness=max(0,min(100,round(available-5)))
    risk_status,risk_flags=base.risk_filter(m)
    current=f(m.get('price'));buy=f(e.get('avg_price'));price_move=((current/buy)-1)*100 if current and buy else None
    if e.get('possible_private_placement'):risk_flags.append('Aynı gün/aynı fiyat çoklu P alımı: private placement veya finansman olabilir')
    if price_move is not None and price_move>30:risk_flags.append(f'Fiyat insider alımından sonra %{price_move:.0f} yükselmiş')
    if price_move is not None and price_move<-30:risk_flags.append(f'Fiyat insider alımından sonra %{abs(price_move):.0f} düşmüş')
    if risk_status!='BLOCK' and risk_flags:risk_status='WARN'
    high=normalized>=75 and completeness>=75 and m.get('technical_confirmation')=='confirmed' and risk_status=='PASS' and not e.get('possible_private_placement')
    verdict='RİSKLİ / ELE' if risk_status=='BLOCK' else 'YÜKSEK İNANÇ ADAYI' if high else 'İZLE / TEYİT BEKLE' if normalized>=58 else 'DÜŞÜK ÖNCELİK'
    return {'score':normalized,'data_completeness_pct':completeness,'components':components,'freshness_hours':round(age,1) if age is not None else None,'freshness_label':'İşlem tarihi yaşı (SEC filing zamanı mevcut değil)','cluster_insiders_10d':total,'management_cluster_10d':management,'cluster_value_10d':round(cluster_value,2),'risk_status':risk_status,'risk_flags':risk_flags,'price_vs_insider_pct':round(price_move,2) if price_move is not None else None,'verdict':verdict}

def main():
    now=base.utcnow();base.OUT_DIR.mkdir(parents=True,exist_ok=True)
    existing=base.load_json(base.RAW,[])
    global_rows,provider_updated=fetch_global()
    tickers=prelim(global_rows)
    old_by_ticker=defaultdict(list)
    for e in existing:old_by_ticker[e.get('ticker')].append(e)
    # Only request detailed history when a ticker has at least one global row not
    # already carrying post-transaction holdings in our cached raw events.
    need=[]
    oldkeys={e.get('source_key') for e in existing if e.get('post_shares') is not None}
    for t in tickers:
        rr=[r for r in global_rows if str(r.get('ticker') or '').upper()==t]
        if any(key(r) not in oldkeys for r in rr):need.append(t)
    detail_map={}
    for t in need[:MAX_DETAIL_TICKERS]:
        try:
            detail_map[t],_=fetch_detail(t)
        except Exception as exc:print('WARN detail',t,exc)
    events=make_events(global_rows,detail_map,existing)
    # For records whose ticker wasn't refreshed this run, retain previously cached
    # holdings so position-increase scoring remains available.
    oldmap={e.get('source_key'):e for e in existing}
    for e in events:
        if e.get('post_shares') is None and e.get('source_key') in oldmap:
            old=oldmap[e['source_key']]
            for k in ('post_shares','prior_shares_est','position_increase_pct','new_position'):
                if old.get(k) is not None:e[k]=old.get(k)
    candidate_tickers=prelim(global_rows)[:30]
    market=base.market_enrichment(candidate_tickers)
    display=[];cut=now-timedelta(days=DISPLAY_DAYS)
    for e in events:
        d=date_dt(e.get('transaction_date'))
        if not d or d<cut:continue
        e['market']=market.get(e['ticker'],{})
        e['issuer']=e['market'].get('name') or e['ticker']
        e['conviction']=score(e,e['market'],events,now)
        display.append(e)
    display.sort(key=lambda x:(x['conviction']['score'],x.get('value_usd') or 0,x.get('transaction_date') or ''),reverse=True)
    provider_dt=base.parse_dt(provider_updated);provider_age=((now-provider_dt).total_seconds()/60) if provider_dt else None
    latest={'version':35,'generated_at':base.iso(now),'source':'Xoomar Form 4 API (SEC EDGAR-derived) + Yahoo Finance market enrichment','canonical_source':'SEC EDGAR','provider_updated_at':provider_updated,'provider_age_minutes':round(provider_age,1) if provider_age is not None else None,'source_scope':'Only Xoomar buy feed rows cross-checked as txCode=P and isOpenMarket=true when ticker history is fetched','filing_timestamp_available':False,'freshness_note':'Keyless feed exposes transaction date, not SEC acceptance time. Freshness score is conservatively capped and labelled as a proxy.','score_is_probability':False,'window_days':DISPLAY_DAYS,'cluster_window_days':CLUSTER_DAYS,'stats':{'events':len(display),'tickers':len({e['ticker'] for e in display}),'cluster_events':sum(1 for e in display if e['conviction']['cluster_insiders_10d']>=2),'management_cluster_events':sum(1 for e in display if e['conviction']['management_cluster_10d']>=2),'high_conviction':sum(1 for e in display if e['conviction']['verdict']=='YÜKSEK İNANÇ ADAYI'),'risk_blocked':sum(1 for e in display if e['conviction']['risk_status']=='BLOCK')},'events':display[:80],'methodology':{'filters':['Form 4 P open-market purchase','insider role/title','purchase value','post-transaction holdings and position increase','10-day cluster buying','transaction-date recency proxy','market cap','20d dollar volume','ATR','spread','short float','trend','technical confirmation','risk gate'],'placement_control':'Same-date/same-price multi-buyer events are flagged as possible private placements/financings and cannot become high-conviction candidates.','risk_gate':'BLOCK overrides score. Missing fields lower data completeness. Conviction score is not a probability.'}}
    base.save_json(base.RAW,events);base.save_json(base.LATEST,latest);base.save_json(base.STATE,{'updated_at':base.iso(now),'provider_updated_at':provider_updated,'detail_tickers_requested':need[:MAX_DETAIL_TICKERS],'global_rows':len(global_rows)})
    print(json.dumps(latest['stats'],indent=2));print('provider_updated_at',provider_updated,'age_min',provider_age)
    return 0

if __name__=='__main__':raise SystemExit(main())
