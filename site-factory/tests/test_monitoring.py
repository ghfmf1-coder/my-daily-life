"""Local checks for the fleet monitor's roster and parser, never hit the internet."""
import importlib.util
import sys
import unittest
import tempfile
from unittest.mock import patch
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
    def test_owner_only_admin_access_challenge_is_healthy(self):
        response={"status":200,"content_type":"text/html; charset=utf-8",
                  "body":b"<title>Cloudflare Access</title><p>Log in to adminivo.com</p>"}
        self.assertTrue(mod.is_access_challenge(response))
        self.assertFalse(mod.is_access_challenge({**response,"body":b"<title>Normal app</title>"}))
        self.assertFalse(mod.is_access_challenge({**response,"status":403}))
    def test_migrated_builds_use_representatives_without_disabling_checks(self):
        import factory
        for slug in sorted(mod.MIGRATED_TO_HUB):
            site=next(x for x in mod.roster() if x['slug']==slug)
            self.assertIn('.pages.dev',site['origin'])
            with tempfile.TemporaryDirectory() as tmp:
                root=Path(tmp)/'build';factory.prepare(slug,root)
                def response(url,max_bytes=mod.MAX_BYTES):
                    path=__import__('urllib.parse',fromlist=['urlparse']).urlparse(url).path
                    file=root/(path.strip('/')+'/index.html' if path.endswith('/') else path.lstrip('/'))
                    if path=='/':file=root/'index.html'
                    return {'status':200,'url':url,'content_type':'text/html' if file.suffix=='.html' else 'application/octet-stream','body':file.read_bytes(),'elapsed_ms':1}
                with patch.object(mod,'fetch',response):
                    result=mod.check_site(site)
                    self.assertEqual(result['status'],'pass',result['failures'])
                # An obsolete self-canonical is still an actual failure.
                text=(root/'index.html').read_text().replace('rel="canonical" href="https://abreda.com/tools/'+slug+'/', 'rel="canonical" href="'+site['origin']+'/')
                with patch.object(mod,'fetch',return_value={'status':200,'content_type':'text/html','body':text.encode(),'elapsed_ms':1}):
                    result=mod.create_site_record(site);mod.safe_page(site,result,'/')
                    self.assertTrue(any(x.startswith('canonical_ko:') for x in result['failures']))
    def test_non_migrated_site_retains_own_canonical(self):
        site=next(x for x in mod.roster() if x['slug']=='novel-planner')
        self.assertEqual(mod.representative_urls(site)['ko'],site['origin']+'/')
    def test_result_does_not_expose_user_records(self):
        s=mod.roster()[0]
        record=mod.create_site_record(s)
        self.assertNotIn("payload",record)
        self.assertNotIn("email",record)
if __name__=="__main__":unittest.main()
