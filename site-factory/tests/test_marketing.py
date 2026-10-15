import json
import sys
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import marketing
class MarketingTests(unittest.TestCase):
 def test_packets_are_real_and_exclude_internal(self):
  d=marketing.build_packets()
  sites={s['slug']:s for s in d['sites']}
  self.assertTrue({'my-daily-life','csv-merge-studio','novel-planner','manuscript-lens'}.issubset(sites))
  self.assertNotIn('toolbox-admin',sites)
  self.assertNotIn('deployment-check',sites)
  for slug in ('csv-merge-studio','novel-planner','manuscript-lens'):
   self.assertEqual(sites[slug]['status'],'draft-ready')
   self.assertIn('en',sites[slug]['copy'])
   self.assertTrue(sites[slug]['shareLinks'])
 def test_hub_is_real_navigation(self):
  import tempfile
  from pathlib import Path
  import factory
  with tempfile.TemporaryDirectory() as d:
   out=Path(d)/'hub'
   factory.prepare('toolbox-hub',out)
   ko=(out/'index.html').read_text()
   en=(out/'en/index.html').read_text()
   self.assertIn('data-category="writing"',ko)
   self.assertIn('https://csv.abreda.com/',en)
   self.assertIn('https://novel.abreda.com/en/',en)
   self.assertNotIn('tb-toolbox-admin.pages.dev/',ko)
   self.assertNotIn('AUTO_CATALOG_CARDS',ko)
 def test_tracking_links_preserve_language_and_canonical(self):
  x=marketing.packet_url("https://tb-a.pages.dev/","community","a",language="en")
  self.assertTrue(x.startswith("https://tb-a.pages.dev/en/"))
  self.assertIn("utm_source=community",x)
  with self.assertRaises(ValueError):
   marketing.packet_url("javascript:alert(1)","community","a")
if __name__=='__main__':unittest.main()
