from __future__ import annotations

import re
from datetime import timedelta
import fetch_mic_insiders as base

# SEC's legacy getcurrent CGI can reject cloud-runner IPs. Use the official
# EDGAR daily master indexes instead, then fetch each filing from Archives.
def archive_form4_entries():
    today=base.utcnow().date(); entries=[]; dates_found=0
    for days_back in range(0,12):
        d=today-timedelta(days=days_back)
        q=(d.month-1)//3+1
        url=f'https://www.sec.gov/Archives/edgar/daily-index/{d.year}/QTR{q}/master.{d:%Y%m%d}.idx'
        try:
            r=base.sec_get(url,timeout=25)
        except Exception as exc:
            # Weekends/holidays are normally 404. Other errors are logged and skipped
            # so one missing index cannot kill the entire scanner.
            print(f'INFO index {d}: {exc}')
            continue
        dates_found+=1
        body=r.text
        sep=body.find('CIK|Company Name|Form Type|Date Filed|Filename')
        if sep<0:
            continue
        lines=body[sep:].splitlines()[1:]
        day=[]
        for line in lines:
            parts=line.split('|')
            if len(parts)!=5 or parts[2].strip()!='4':
                continue
            cik,company,form,filed,filename=[x.strip() for x in parts]
            m=re.search(r'(\d{10}-\d{2}-\d{6})',filename)
            if not m:
                continue
            accession=m.group(1); nodash=accession.replace('-','')
            txt_url='https://www.sec.gov/Archives/'+filename.lstrip('/')
            sec_url=f'https://www.sec.gov/Archives/edgar/data/{int(cik)}/{nodash}/{accession}-index.htm'
            day.append({'accession':accession,'cik':cik,'txt_url':txt_url,'sec_url':sec_url,'updated':None,'title':company})
        # newest calendar date first; the state file prevents repeat downloads.
        entries.extend(day)
        if dates_found>=5:
            break
    print(f'EDGAR daily indexes: {dates_found} filing days, {len(entries)} Form 4 filings discovered')
    return entries

base.current_form4_entries=archive_form4_entries
base.MAX_NEW_FILINGS=int(base.os.environ.get('MIC_MAX_NEW_FORM4','250'))

if __name__=='__main__':
    raise SystemExit(base.main())
