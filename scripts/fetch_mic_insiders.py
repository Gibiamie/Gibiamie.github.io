from __future__ import annotations

import json, math, os, re, time, xml.etree.ElementTree as ET
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
import requests
try:
    import yfinance as yf
except Exception:
    yf=None

ROOT=Path(__file__).resolve().parents[1]
OUT_DIR=ROOT/'mic'/'data'/'insider'; LATEST=OUT_DIR/'latest.json'; RAW=OUT_DIR/'raw_events.json'; STATE=OUT_DIR/'state.json'
SEC_AGENT=os.environ.get('SEC_USER_AGENT','MIC Insider Scanner/1.0 100677393+Gibiamie@users.noreply.github.com')
SEC_SESSION=requests.Session(); SEC_SESSION.headers.update({'User-Agent':SEC_AGENT,'Accept-Encoding':'gzip, deflate','Host':'www.sec.gov'})
SCAN_PAGES=int(os.environ.get('MIC_SEC_PAGES','2')); FEED_COUNT=100; MAX_NEW_FILINGS=int(os.environ.get('MIC_MAX_NEW_FORM4','120'))
RAW_RETENTION_DAYS=30; DISPLAY_DAYS=10; CLUSTER_DAYS=10

def utcnow(): return datetime.now(timezone.utc)
def iso(dt): return dt.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z') if dt else None
def load_json(path,default):
    try:return json.loads(path.read_text('utf-8'))
    except Exception:return default
def save_json(path,value): path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n','utf-8')
def sec_get(url,timeout=25):
    r=SEC_SESSION.get(url,timeout=timeout)
    if r.status_code==403: raise RuntimeError('SEC EDGAR 403: check User-Agent/rate')
    r.raise_for_status(); time.sleep(.13); return r

def strip_ns(root):
    for el in root.iter():
        if '}' in el.tag: el.tag=el.tag.split('}',1)[1]
    return root
def text(node,path,default=''):
    if node is None:return default
    f=node.find(path); return f.text.strip() if f is not None and f.text else default
def num(node,path):
    s=text(node,path)
    try:return float(s.replace(',','')) if s else None
    except ValueError:return None
def bval(node,path): return text(node,path).lower() in {'1','true','yes','y'}

def role_info(owner):
    rel=owner.find('reportingOwnerRelationship'); title=text(rel,'officerTitle') or None; upper=(title or '').upper()
    director=bval(rel,'isDirector'); officer=bval(rel,'isOfficer'); ten=bval(rel,'isTenPercentOwner'); other=bval(rel,'isOther')
    if officer and any(k in upper for k in ('CEO','CHIEF EXECUTIVE','PRESIDENT')):return 'CEO / President',title,12
    if officer and any(k in upper for k in ('CFO','CHIEF FINANCIAL')):return 'CFO',title,12
    if officer and any(k in upper for k in ('COO','CHIEF OPERATING')):return 'COO',title,11
    if officer and director:return 'Officer + Director',title,11
    if officer:return 'Officer',title,10
    if director:return 'Director',title,8
    if ten:return '10%+ Owner',title,5
    if other:return 'Other Insider',title,3
    return 'Reporting Person',title,2

def parse_acceptance(submission,fallback=None):
    m=re.search(r'<ACCEPTANCE-DATETIME>(\d{14})',submission)
    if not m:return fallback
    try:
        from zoneinfo import ZoneInfo
        return datetime.strptime(m.group(1),'%Y%m%d%H%M%S').replace(tzinfo=ZoneInfo('America/New_York')).astimezone(timezone.utc)
    except Exception:return fallback

def parse_form4_submission(submission,accession,sec_url,feed_updated):
    m=re.search(r'(<ownershipDocument(?:\s[^>]*)?>.*?</ownershipDocument>)',submission,re.S|re.I)
    if not m:return []
    try:root=strip_ns(ET.fromstring(m.group(1)))
    except ET.ParseError:return []
    ticker=text(root,'issuer/issuerTradingSymbol').upper(); issuer=text(root,'issuer/issuerName'); cik=text(root,'issuer/issuerCik')
    if not ticker or ticker in {'NONE','N/A'}:return []
    filed_at=parse_acceptance(submission,feed_updated); events=[]; owners=root.findall('reportingOwner') or [None]
    for owner in owners:
        owner_name=text(owner,'reportingOwnerId/rptOwnerName','Unknown'); owner_cik=text(owner,'reportingOwnerId/rptOwnerCik') or owner_name
        role,officer_title,role_points=role_info(owner) if owner is not None else ('Reporting Person',None,2); txs=[]
        for tx in root.findall('nonDerivativeTable/nonDerivativeTransaction'):
            code=text(tx,'transactionCoding/transactionCode').upper(); acquired=text(tx,'transactionAmounts/transactionAcquiredDisposedCode/value').upper()
            shares=num(tx,'transactionAmounts/transactionShares/value'); price=num(tx,'transactionAmounts/transactionPricePerShare/value')
            post=num(tx,'postTransactionAmounts/sharesOwnedFollowingTransaction/value'); direct=text(tx,'ownershipNature/directOrIndirectOwnership/value').upper() or None; tdate=text(tx,'transactionDate/value') or None
            if code!='P' or acquired!='A' or not shares or shares<=0 or not price or price<=0:continue
            txs.append({'transaction_date':tdate,'shares':shares,'price':price,'value_usd':shares*price,'post_shares':post,'ownership':direct})
        if not txs:continue
        total_shares=sum(x['shares'] for x in txs); total_value=sum(x['value_usd'] for x in txs); avg_price=total_value/total_shares if total_shares else None
        dated=[x['transaction_date'] for x in txs if x['transaction_date']]; tx_date=max(dated) if dated else None
        post_candidates=[x['post_shares'] for x in txs if x['post_shares'] is not None]; post_shares=post_candidates[-1] if post_candidates else None
        prior_shares=None; position_increase_pct=None; new_position=False
        if post_shares is not None:
            prior_shares=post_shares-total_shares
            if prior_shares>0:position_increase_pct=total_shares/prior_shares*100
            elif post_shares>=total_shares:new_position=True
        events.append({'id':f'{accession}:{owner_cik}','accession':accession,'ticker':ticker,'issuer':issuer,'issuer_cik':cik,'insider':owner_name,'insider_cik':owner_cik,'role':role,'officer_title':officer_title,'role_points':role_points,'transaction_date':tx_date,'filed_at':iso(filed_at),'shares':round(total_shares,4),'avg_price':round(avg_price,6) if avg_price is not None else None,'value_usd':round(total_value,2),'post_shares':round(post_shares,4) if post_shares is not None else None,'prior_shares_est':round(prior_shares,4) if prior_shares is not None else None,'position_increase_pct':round(position_increase_pct,2) if position_increase_pct is not None else None,'new_position':new_position,'ownership_forms':sorted({x['ownership'] for x in txs if x['ownership']}),'transaction_count':len(txs),'sec_url':sec_url,'source_rule':'Form 4 non-derivative transaction code P + acquired A only'})
    return events

def parse_dt(s):
    if not s:return None
    try:return datetime.fromisoformat(s.replace('Z','+00:00')).astimezone(timezone.utc)
    except ValueError:return None
def text_ns(node,path,ns):
    f=node.find(path,ns); return f.text.strip() if f is not None and f.text else ''

def current_form4_entries():
    ns={'a':'http://www.w3.org/2005/Atom'}; entries=[]
    for page in range(SCAN_PAGES):
        start=page*FEED_COUNT; url='https://www.sec.gov/cgi-bin/browse-edgar?'+f'action=getcurrent&type=4&company=&dateb=&owner=include&start={start}&count={FEED_COUNT}&output=atom'
        root=ET.fromstring(sec_get(url).text); batch=root.findall('a:entry',ns)
        for e in batch:
            ln=e.find('a:link',ns); link=ln.attrib.get('href','') if ln is not None else ''; updated=parse_dt(text_ns(e,'a:updated',ns)); title=text_ns(e,'a:title',ns)
            acc=re.search(r'(\d{10}-\d{2}-\d{6})',link) or re.search(r'(\d{10}-\d{2}-\d{6})',text_ns(e,'a:id',ns)); cik=re.search(r'/data/(\d+)/',link)
            if not acc or not cik:continue
            accession=acc.group(1); c=cik.group(1); nodash=accession.replace('-',''); txt_url=f'https://www.sec.gov/Archives/edgar/data/{int(c)}/{nodash}/{accession}.txt'
            entries.append({'accession':accession,'cik':c,'txt_url':txt_url,'sec_url':link,'updated':updated,'title':title})
        if len(batch)<FEED_COUNT:break
    return entries

def fetch_new_events(existing,state):
    seen=set(state.get('seen_accessions',[])); entries=current_form4_entries(); new_entries=[e for e in entries if e['accession'] not in seen][:MAX_NEW_FILINGS]; new_events=[]; processed=[]
    for e in new_entries:
        try:
            submission=sec_get(e['txt_url'],30).text; new_events.extend(parse_form4_submission(submission,e['accession'],e['sec_url'],e['updated'])); processed.append(e['accession'])
        except Exception as exc:print(f"WARN SEC {e['accession']}: {exc}")
    seen.update(processed); state['seen_accessions']=list(seen)[-5000:]; state['last_sec_scan_at']=iso(utcnow()); state['feed_entries_seen']=len(entries); state['new_filings_processed']=len(processed)
    merged={e['id']:e for e in existing if e.get('id')}; merged.update({e['id']:e for e in new_events}); cutoff=utcnow()-timedelta(days=RAW_RETENTION_DAYS); kept=[]
    for e in merged.values():
        dt=parse_dt(e.get('filed_at'))
        if dt is None or dt>=cutoff:kept.append(e)
    kept.sort(key=lambda x:x.get('filed_at') or '',reverse=True); return kept,state

def safe_float(x):
    try:
        v=float(x); return v if math.isfinite(v) else None
    except Exception:return None
def series_values(frame,key):
    try:return [float(x) for x in frame[key].dropna().tolist() if math.isfinite(float(x))]
    except Exception:return []

def market_enrichment(tickers):
    out={t:{} for t in tickers}
    if yf is None or not tickers:return out
    yahoo={t:t.replace('.','-') for t in tickers}; reverse={v:k for k,v in yahoo.items()}; symbols=list(reverse)
    try:data=yf.download(tickers=symbols,period='6mo',interval='1d',group_by='ticker',auto_adjust=False,progress=False,threads=True)
    except Exception as exc:print('WARN yfinance batch:',exc); data=None
    for ys in symbols:
        t=reverse[ys]
        try:
            frame=data[ys] if data is not None and len(symbols)>1 else data; closes=series_values(frame,'Close'); highs=series_values(frame,'High'); lows=series_values(frame,'Low'); vols=series_values(frame,'Volume')
            if len(closes)>=55 and len(highs)==len(closes) and len(lows)==len(closes):
                last=closes[-1]; sma20=sum(closes[-20:])/20; sma50=sum(closes[-50:])/50; sma20_prev=sum(closes[-25:-5])/20 if len(closes)>=25 else sma20; trs=[]
                for i in range(max(1,len(closes)-14),len(closes)):trs.append(max(highs[i]-lows[i],abs(highs[i]-closes[i-1]),abs(lows[i]-closes[i-1])))
                atr14=sum(trs)/len(trs) if trs else None; dv=[closes[i]*vols[i] for i in range(max(0,len(closes)-20),len(closes)) if i<len(vols)]; avg_dollar=sum(dv)/len(dv) if dv else None; volume20=sum(vols[-20:])/min(20,len(vols)) if vols else None; volume_ratio=vols[-1]/volume20 if volume20 and vols else None
                trend='bullish' if last>sma20>sma50 and sma20>sma20_prev else 'bearish' if last<sma20<sma50 and sma20<sma20_prev else 'neutral'; technical='confirmed' if trend=='bullish' and volume_ratio is not None and volume_ratio>=1 else 'watch' if last>sma20 else 'unconfirmed'
                out[t].update({'price':round(last,4),'sma20':round(sma20,4),'sma50':round(sma50,4),'atr14_pct':round(atr14/last*100,2) if atr14 and last else None,'avg_dollar_volume_20d':round(avg_dollar,2) if avg_dollar else None,'volume_ratio_20d':round(volume_ratio,2) if volume_ratio is not None else None,'trend':trend,'technical_confirmation':technical})
        except Exception as exc:print(f'WARN bars {t}: {exc}')
    for ys in symbols[:30]:
        t=reverse[ys]
        try:
            tk=yf.Ticker(ys); fi=dict(tk.fast_info or {}); mc=safe_float(fi.get('market_cap') or fi.get('marketCap'))
            if mc:out[t]['market_cap']=round(mc,2)
            info=tk.get_info() or {}; bid=safe_float(info.get('bid')); ask=safe_float(info.get('ask')); mid=(bid+ask)/2 if bid and ask and ask>=bid else None; spread=(ask-bid)/mid*100 if mid else None; short=safe_float(info.get('shortPercentOfFloat')); short=short*100 if short is not None and short<=1 else short
            out[t].update({'spread_pct':round(spread,3) if spread is not None else None,'short_float_pct':round(short,2) if short is not None else None})
            if not out[t].get('market_cap'):
                mc=safe_float(info.get('marketCap'))
                if mc:out[t]['market_cap']=round(mc,2)
        except Exception as exc:print(f'WARN quote {t}: {exc}')
    return out

def points_value(v):
    if v>=5_000_000:return 15
    if v>=1_000_000:return 13
    if v>=250_000:return 10
    if v>=100_000:return 7
    if v>=50_000:return 4
    return 1
def points_position(e):
    if e.get('new_position'):return 12
    p=e.get('position_increase_pct')
    if p is None:return 0
    if p>=50:return 12
    if p>=25:return 10
    if p>=10:return 8
    if p>=5:return 5
    return 2
def points_cluster(n):return 14 if n>=4 else 11 if n==3 else 7 if n==2 else 0
def points_fresh(h):
    if h is None:return 0
    return 10 if h<=24 else 8 if h<=48 else 6 if h<=72 else 4 if h<=120 else 2 if h<=240 else 0
def points_market_cap(v):return None if v is None else 7 if 100_000_000<=v<=10_000_000_000 else 5 if v>10_000_000_000 else 4 if v>=50_000_000 else 1
def points_dollar_volume(v):return None if v is None else 8 if v>=50_000_000 else 7 if v>=10_000_000 else 5 if v>=5_000_000 else 3 if v>=1_000_000 else 0
def points_spread(v):return None if v is None else 5 if v<=.15 else 4 if v<=.35 else 3 if v<=.75 else 1 if v<=1.5 else 0
def points_short(v):return None if v is None else 5 if 5<=v<=15 else 3 if v<5 else 3 if v<=25 else 1 if v<=35 else 0

def risk_filter(m):
    flags=[]; price=m.get('price'); mc=m.get('market_cap'); dv=m.get('avg_dollar_volume_20d'); spread=m.get('spread_pct'); atr=m.get('atr14_pct'); short=m.get('short_float_pct'); trend=m.get('trend')
    if price is not None and price<1:flags.append('Fiyat $1 altında')
    if dv is not None and dv<500_000:flags.append('20g dolar hacmi $0.5M altında')
    if spread is not None and spread>2.5:flags.append('Spread %2.5 üzerinde')
    if mc is not None and mc<30_000_000:flags.append('Piyasa değeri $30M altında')
    if flags:return 'BLOCK',flags
    if atr is not None and atr>10:flags.append('ATR yüksek')
    if short is not None and short>30:flags.append('Short float yüksek')
    if mc is not None and mc<100_000_000:flags.append('Micro/small cap riski')
    if spread is not None and spread>1:flags.append('Spread geniş')
    if trend=='bearish':flags.append('Mevcut trend aşağı')
    return ('WARN' if flags else 'PASS'),flags

def score_event(e,market,cluster_count,cluster_value,now):
    filed=parse_dt(e.get('filed_at')); freshness=max(0,(now-filed).total_seconds()/3600) if filed else None
    components={'insider_role':{'points':int(e.get('role_points') or 0),'max':12},'purchase_value':{'points':points_value(float(e.get('value_usd') or 0)),'max':15},'position_increase':{'points':points_position(e),'max':12},'cluster_buying':{'points':points_cluster(cluster_count),'max':14},'filing_freshness':{'points':points_fresh(freshness),'max':10}}
    optional={'market_cap':(points_market_cap(market.get('market_cap')),7),'dollar_volume':(points_dollar_volume(market.get('avg_dollar_volume_20d')),8),'spread':(points_spread(market.get('spread_pct')),5),'short_interest':(points_short(market.get('short_float_pct')),5),'trend':({'bullish':6,'neutral':3,'bearish':0}.get(market.get('trend')) if market.get('trend') else None,6),'technical_confirmation':({'confirmed':6,'watch':3,'unconfirmed':0}.get(market.get('technical_confirmation')) if market.get('technical_confirmation') else None,6)}
    for k,(p,mx) in optional.items():components[k]={'points':p,'max':mx}
    available=sum(v['max'] for v in components.values() if v['points'] is not None); earned=sum(v['points'] for v in components.values() if v['points'] is not None); normalized=round(earned/available*100) if available else 0; completeness=round(available)
    risk_status,risk_flags=risk_filter(market)
    verdict='RİSKLİ / ELE' if risk_status=='BLOCK' else 'YÜKSEK İNANÇ ADAYI' if normalized>=75 and completeness>=80 and market.get('technical_confirmation')=='confirmed' and risk_status=='PASS' else 'İZLE / TEYİT BEKLE' if normalized>=60 and completeness>=65 else 'DÜŞÜK ÖNCELİK'
    return {'score':normalized,'data_completeness_pct':completeness,'components':components,'freshness_hours':round(freshness,1) if freshness is not None else None,'cluster_insiders_10d':cluster_count,'cluster_value_10d':round(cluster_value,2),'risk_status':risk_status,'risk_flags':risk_flags,'verdict':verdict}

def build_latest(events):
    now=utcnow(); cutoff=now-timedelta(days=DISPLAY_DAYS); display=[e.copy() for e in events if (parse_dt(e.get('filed_at')) or now)>=cutoff]; tickers=sorted({e['ticker'] for e in display if e.get('ticker')}); market=market_enrichment(tickers); by_ticker=defaultdict(list)
    for e in events:by_ticker[e.get('ticker','')].append(e)
    for e in display:
        filed=parse_dt(e.get('filed_at')) or now; start=filed-timedelta(days=CLUSTER_DAYS); peers=[x for x in by_ticker[e['ticker']] if start<=(parse_dt(x.get('filed_at')) or filed)<=filed]; distinct={x.get('insider_cik') or x.get('insider') for x in peers}; cluster_value=sum(float(x.get('value_usd') or 0) for x in peers); e['market']=market.get(e['ticker'],{}); e['conviction']=score_event(e,e['market'],len(distinct),cluster_value,now)
    display.sort(key=lambda x:(x['conviction']['score'],x.get('value_usd') or 0,x.get('filed_at') or ''),reverse=True)
    return {'version':35,'generated_at':iso(now),'source':'SEC EDGAR Form 4 + Yahoo market-data enrichment','source_scope':'Non-derivative open-market purchases only: transactionCode=P and acquiredDisposedCode=A','score_is_probability':False,'window_days':DISPLAY_DAYS,'cluster_window_days':CLUSTER_DAYS,'stats':{'events':len(display),'tickers':len({e['ticker'] for e in display}),'cluster_events':sum(1 for e in display if e['conviction']['cluster_insiders_10d']>=2),'high_conviction':sum(1 for e in display if e['conviction']['verdict']=='YÜKSEK İNANÇ ADAYI')},'events':display[:80],'methodology':{'filters':['Form 4','P purchase code','A acquired code','insider role','purchase value','position increase','10-day cluster','filing freshness','market cap','20d dollar volume','spread','short float','trend','technical confirmation','risk gate'],'risk_gate':'BLOCK overrides score. Missing metadata lowers data completeness and prevents high-conviction classification.'}}

def main():
    OUT_DIR.mkdir(parents=True,exist_ok=True); existing=load_json(RAW,[]); state=load_json(STATE,{}); events,state=fetch_new_events(existing,state); latest=build_latest(events); save_json(RAW,events); save_json(STATE,state); save_json(LATEST,latest); print(json.dumps(latest['stats'],indent=2)); return 0
if __name__=='__main__':raise SystemExit(main())
