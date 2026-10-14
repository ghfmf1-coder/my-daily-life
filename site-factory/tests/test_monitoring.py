"""Local checks for the fleet monitor's roster and parser, never hit the internet."""
import importlib.util
import sys
import unittest
from pathlib import Path
S = Path(__file__).resolve().parents[1] / "monitoring" / "check_sites.py"
spec=importlib.util.spec_from_file_location("toolbox_monitor",S)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
class HealthMonitoringTests(unittest.TestCase):
    def test_registry_includes_existing_and_future_factory_sites(self):
        items=mod.roster()
        keys={s["slug"] for s in items}
        self.assertTrue({"my-daily-life","novel-planner","manuscript-lens",
                         "csv-merge-studio","toolbox-admin"}.issubset(keys))
        self.assertEqual(len(keys),len(items))
        self.assertTrue(next(x for x in items if x["slug"]=="toolbox-admin")["internal"])
    def test_parser_extracts_canonical_and_languages(self):
        p=mod.SiteHTML()
        p.feed('<html lang="en"><head><title>A tool for editing</title>'
               '<meta name="description" content="A useful English web app with original work">'
               '<link rel="canonical" href="https://tb-sample.pages.dev/en/">'
               '<link rel="alternate" hreflang="ko" href="https://tb-sample.pages.dev/">'
               '</head><body><div id="adminGate"></div></body></html>')
        self.assertEqual(p.canonical(),"https://tb-sample.pages.dev/en/")
        self.assertEqual(p.alternate("ko"),"https://tb-sample.pages.dev/")
        self.assertIn("adminGate",p.ids)
    def test_result_does_not_expose_user_records(self):
        s=mod.roster()[0]
        record=mod.create_site_record(s)
        self.assertNotIn("payload",record)
        self.assertNotIn("email",record)
if __name__=="__main__":unittest.main()
