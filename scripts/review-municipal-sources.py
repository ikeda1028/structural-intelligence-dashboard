"""Cache explicitly selected official sources for human page-level review.

Usage: python review-municipal-sources.py URL ...
Outputs are local audit evidence, not automatic findings or publishable summaries.
"""
import hashlib
import json
import sys
import subprocess
import ssl
from urllib.error import URLError
from threading import Lock
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
import pypdfium2 as pdfium

OUT = Path(__file__).resolve().parents[1] / 'work' / 'next-ten-source-review'
PDF_LOCK = Lock()

class Parser(HTMLParser):
    def __init__(self):
        super().__init__(); self.text=[]; self.links=[]; self.anchor=None; self.skip=0; self.base=None
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style'): self.skip+=1
        if tag=='a': self.anchor={'title':'','url':dict(attrs).get('href','')}
        if tag=='base': self.base=dict(attrs).get('href')
    def handle_endtag(self, tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
        if tag=='a' and self.anchor: self.links.append(self.anchor); self.anchor=None
    def handle_data(self, text):
        if not self.skip and text.strip(): self.text.append(text.strip())
        if self.anchor: self.anchor['title']+=text.strip()

def fetch(url):
    if urlparse(url).scheme!='https' or not urlparse(url).hostname.endswith(('.lg.jp','.jp')):
        raise ValueError('Select an official HTTPS source explicitly')
    key=hashlib.sha256(url.encode()).hexdigest()[:12]
    try:
        with urlopen(Request(url,headers={'User-Agent':'Municipal-source-review/1.0'}),timeout=45) as r:
            body=r.read(); final=r.url
    except URLError as e:
        if not isinstance(e.reason, ssl.SSLCertVerificationError): raise
        # System curl uses the OS trust store; certificate verification stays on.
        body=subprocess.check_output(['curl','-fLsS','--max-time','45',url]); final=url
    pdf=body.startswith(b'%PDF')
    (OUT/(key+('.pdf' if pdf else '.html'))).write_bytes(body)
    links=[]; count=None
    if pdf:
        with PDF_LOCK:
            doc=pdfium.PdfDocument(body); count=len(doc)
            content='\n'.join('\n--- PDF PAGE '+str(i+1)+' ---\n'+p.get_textpage().get_text_range() for i,p in enumerate(doc))
            doc.close()
    else:
        parser=Parser(); parser.feed(body.decode('utf-8',errors='replace'))
        content='\n'.join(parser.text)
        links=[{'title':a['title'],'url':urljoin(parser.base or final,a['url'])} for a in parser.links if a['url']]
    (OUT/(key+'.txt')).write_text(content)
    record={'key':key,'url':url,'final_url':final,'sha256':hashlib.sha256(body).hexdigest(),'fetched_at':datetime.now(timezone.utc).isoformat(),'pages':count,'links':links}
    (OUT/(key+'.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2))
    return {k:v for k,v in record.items() if k!='links'}

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    with ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(fetch,sys.argv[1:]): print(json.dumps(result,ensure_ascii=False))
