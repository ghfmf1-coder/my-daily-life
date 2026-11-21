import json,re,sys,tempfile,unittest
from pathlib import Path
from urllib.parse import urlparse,urljoin
from html.parser import HTMLParser
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from factory import prepare
from hub_domains import ROUTES, mount_html
class Assets(HTMLParser):
 def __init__(self):super().__init__();self.assets=[]
 def handle_starttag(self,t,items):
  a=dict(items)
  if t in ('script','img') and a.get('src'):self.assets.append(a['src'])
  if t=='link' and a.get('rel') in ('stylesheet','icon') and a.get('href'):self.assets.append(a['href'])
class DomainIntegration(unittest.TestCase):
 def test_mounted_pages_keep_asset_tree_and_language_destinations(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=Path(tmp)/'hub';prepare('toolbox-hub',out)
   sitemap=(out/'sitemap.xml').read_text()
   for row in ROUTES:
    for lang in ('ko','en'):
     url=row[lang+'_url'];path=out/urlparse(url).path.lstrip('/')/'index.html';text=path.read_text();parser=Assets();parser.feed(text)
     self.assertIn('lang="'+lang+'"',text)
     self.assertIn('rel="canonical" href="'+url+'"',text)
     self.assertIn('<loc>'+url+'</loc>',sitemap)
     self.assertEqual(text.count('data-measurement-id='),1)
     self.assertEqual(text.count('data-toolbox-site="tb-'+row['slug']+'"'),1)
     for asset in parser.assets:
      absolute=urlparse(urljoin(url,asset))
      if absolute.netloc=='abreda.com':self.assertTrue((out/absolute.path.lstrip('/')).is_file(),str(path)+': '+asset)
   # Existing hub navigation cannot send visitors back to old migrated hosts.
   for file in (out/'index.html',out/'en/index.html',out/'new-tools/index.html',out/'en/new-tools/index.html'):
    for row in ROUTES:self.assertNotIn(row['old_url'],file.read_text())

 def test_english_policy_links_resolve_to_hub_policy(self):
  row=next(r for r in ROUTES if r['slug']=='subtitle-sync-studio')
  source='<html><head><title>QA</title></head><body><a href="/en/privacy">Privacy</a><a href="/en/terms">Terms</a></body></html>'
  rendered=mount_html(source,row,'en',{})
  self.assertIn('href="https://abreda.com/en/privacy"',rendered)
  self.assertIn('href="https://abreda.com/en/terms"',rendered)
