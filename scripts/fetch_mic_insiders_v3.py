from __future__ import annotations

import re
from datetime import datetime, timezone
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
import fetch_mic_insiders as base

OPENINSIDER='https://openinsider.com/insider-purchases'

def fnum(s):
    if s is None:return None
    t=str(s).strip().replace(',','').replace('$','').replace('+','').replace('%','')
    if not t or t in {'-','—','N/A'}:return None
    mult=1
    if t[-1:] in {'K','M','B'}:
        mult={'K':1e3,'M':1e6,'B':1e9}[t[-1]];t=t[:-1]
    try:return float(t)*mult
    except ValueError:return None

def role_from_title(title):
    u=(title or '').upper()
    if 'CEO' in u or 'CHIEF EXECUTIVE' in u:return 'CEO / President',12
    if 'CFO' in u or 'CHIEF FINANCIAL' in u:return 'CFO',12
    if 'COO' in u or 'CHIEF OPERATING' in u:return 'COO',11
    if ('PRES' in u or 'PRESIDENT' in u) and 'VICE' not in u:return 'CEO / President',11
    if 'VP' in u or 'OFFICER' in u:return 'Officer',10
    if 'DIR' in u:return 'Director',8
    if '10%' in u:return '10%+ Owner',5
    return 'Reporting Person',3

def parse_filing_dt(s):
    for fmt in ('%Y-%m-%d %H:%M:%S','%Y-%m-%d'):
        try:return datetime.strptime(s.strip(),fmt).replace(tzinfo=timezone.utc)
        except Exception:pass
    return base.utcnow()

def openinsider_entries():
    headers={'User-Agent':'Mozilla/5.0 (compatible; MIC Insider Scanner/1.0; +https://gibiamie.github.io/mic/)'}
    r=requests.get(OPENINSIDER,headers=headers,timeout=30);r.raise_for_status()
    soup=BeautifulSoup(r.text,'html.parser');table=soup.find('table',class_=re.compile('tinytable')) or soup.find('table')
    if not table:raise RuntimeError('OpenInsider purchase table not found')
    rows=[]
    for tr in table.find_all('tr'):
        cells=tr.find_all(['td','th'])
        vals=[' '.join(c.stripped_strings) for c in cells]
        if len(vals)<12 or vals[1].lower().startswith('filing') or 'P - Purchase' not in vals:
            continue
        # OpenInsider purchase table commonly includes a leading X/flags column.
        offset=1 if len(vals)>=13 else 0
        try:
            filing=vals[offset]; trade_date=vals[offset+1]; ticker=vals[offset+2].strip().upper(); company=vals[offset+3]; insider=vals[offset+4]; title=vals[offset+5]; trade_type=vals[offset+6]; price=fnum(vals[offset+7]); qty=fnum(vals[offset+8]); owned=fnum(vals[offset+9]); delta=vals[offset+10]; value=fnum(vals[offset+11])
        except Exception:
            continue
        if not ticker or not price or not qty or 'P' not in trade_type:continue
        if not value:value=price*qty
        new_position='NEW' in delta.upper(); pos_pct=None if new_position else fnum(delta)
        role,role_points=role_from_title(title)
        sec_url=None
        for a in tr.find_all('a',href=True):
            href=a['href']
            if 'sec.gov' in href or '/Archives/edgar/' in href:
                sec_url=urljoin(OPENINSIDER,href);break
        if not sec_url:
            # Preserve traceability to the discovery row if SEC itself is inaccessible from the runner.
            ticker_link=next((urljoin(OPENINSIDER,a['href']) for a in tr.find_all('a',href=True) if ticker in ' '.join(a.stripped_strings).upper()),OPENINSIDER)
            sec_url=ticker_link
        filed=parse_filing_dt(filing)
        event_id=f"oi:{ticker}:{filing}:{insider}:{trade_date}:{qty}:{price}"
        rows.append({'id':event_id,'accession':None,'ticker':ticker,'issuer':company,'issuer_cik':None,'insider':insider,'insider_cik':insider,'role':role,'officer_title':title or None,'role_points':role_points,'transaction_date':trade_date,'filed_at':base.iso(filed),'shares':round(qty,4),'avg_price':round(price,6),'value_usd':round(value,2),'post_shares':round(owned,4) if owned is not None else None,'prior_shares_est':None,'position_increase_pct':round(pos_pct,2) if pos_pct is not None else None,'new_position':new_position,'ownership_forms':[],'transaction_count':1,'sec_url':sec_url,'source_rule':'OpenInsider discovery mirror; Trade Type P - Purchase only','discovery_source':'OpenInsider','sec_direct_verified_by_runner':False})
    print(f'OpenInsider fallback: {len(rows)} purchase rows discovered')
    return rows

def fetch_events(existing,state):
    # First attempt the official SEC archive implementation. GitHub-hosted runner IPs
    # may receive SEC 403s; in that case or if no filing days can be read, use the
    # public OpenInsider Form 4 mirror for discovery. Market/risk enrichment remains ours.
    official=[]
    try:
        import fetch_mic_insiders_v2 as v2
        official=v2.archive_form4_entries()
    except Exception as exc:
        print('INFO SEC discovery unavailable:',exc)
    if official:
        old=base.current_form4_entries;base.current_form4_entries=lambda:official
        try:return base.fetch_new_events(existing,state)
        finally:base.current_form4_entries=old
    events=openinsider_entries();merged={e['id']:e for e in existing if e.get('id')};merged.update({e['id']:e for e in events});state['last_sec_scan_at']=base.iso(base.utcnow());state['discovery_source']='OpenInsider fallback because SEC blocked GitHub runner';state['new_filings_processed']=len(events);return sorted(merged.values(),key=lambda x:x.get('filed_at') or '',reverse=True),state

def build_latest(events):
    out=base.build_latest(events)
    sources={e.get('discovery_source','SEC EDGAR') for e in out['events']}
    out['source']=' + '.join(sorted(sources))+'; market enrichment via Yahoo Finance'
    out['source_scope']='Only P - Purchase rows; no option exercises, grants, gifts or sales'
    out['discovery_notice']='SEC EDGAR remains the canonical filing source. OpenInsider is used only as a discovery mirror when SEC blocks the GitHub-hosted runner.' if 'OpenInsider' in sources else 'SEC EDGAR direct'
    return out

def main():
    base.OUT_DIR.mkdir(parents=True,exist_ok=True);existing=base.load_json(base.RAW,[]);state=base.load_json(base.STATE,{});events,state=fetch_events(existing,state);latest=build_latest(events);base.save_json(base.RAW,events);base.save_json(base.STATE,state);base.save_json(base.LATEST,latest);print(base.json.dumps(latest['stats'],indent=2));return 0

if __name__=='__main__':raise SystemExit(main())
