import unittest
from pathlib import Path
from visit_coverage_audit import collector_from_script,retired
class CollectorDetectionTests(unittest.TestCase):
 def test_real_public_script(self):
  code=Path('site-factory/sites/toolbox-hub/public/toolbox-public-traffic.js').read_text()
  self.assertEqual(collector_from_script(code),'toolbox-public-visit')
  with self.assertRaises(ValueError):collector_from_script(code,'toolbox-visit-collector')
 def test_legacy_and_unsafe_endpoints(self):
  root='https://ytifxhpizractdeytrok.supabase.co/functions/v1/'
  legacy="fetch('"+root+"toolbox-visit-collector',{})"
  public="fetch('"+root+"toolbox-public-visit',{})"
  self.assertEqual(collector_from_script(legacy),'toolbox-visit-collector')
  for code in [legacy+public,public.replace('ytifxhpizractdeytrok','other-project'),public.replace("visit'","visit-evil'"),'toolbox-public-visit']:
   with self.assertRaises(ValueError):collector_from_script(code)
 def test_retirement_is_exact(self):
  self.assertTrue(retired('https://my-daily-life.pages.dev/'))
  self.assertFalse(retired('https://abreda.com/tools/base64-text-codec/'))
  self.assertFalse(retired('https://other-my-daily-life.pages.dev/'))
