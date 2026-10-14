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
 def test_tracking_links_preserve_language_and_canonical(self):
  x=marketing.packet_url("https://tb-a.pages.dev/","showhn","a",language="en")
  self.assertTrue(x.startswith("https://tb-a.pages.dev/en/"))
  self.assertIn("utm_source=showhn",x)
  with self.assertRaises(ValueError):
   marketing.packet_url("javascript:alert(1)","showhn","a")
if __name__=='__main__':unittest.main()
