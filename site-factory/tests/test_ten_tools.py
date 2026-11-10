import sys, json, unittest, subprocess, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'site-factory'/'scripts'))
from factory import validate_site, prepare
SLUGS = ["privacy-redactor","submission-auditor","shift-calendar","worktime-analyzer","label-sheet-maker","cut-plan-optimizer","recurring-payment-finder","meal-timeline","handover-checklist","group-order-summary"]
class NewToolChecks(unittest.TestCase):
    def test_all_approved_and_valid(self):
        for slug in SLUGS:
            with self.subTest(slug=slug):
                config=validate_site(slug,require_approval=True)
                self.assertEqual(config['project'],'tb-'+slug)
                script=ROOT/'site-factory'/'sites'/slug/'public'/'app.js'
                subprocess.run(['node','--check',str(script)],check=True,capture_output=True)
                html=(script.parent/'index.html').read_text(encoding='utf-8')
                self.assertIn('data-toolbox-site="tb-'+slug+'"',html)
                self.assertIn('app.js',html)
    def test_one_domain_and_admin_catalog(self):
        with tempfile.TemporaryDirectory() as base:
            home=Path(base)/'hub'
            prepare('toolbox-hub',home)
            sitemap=(home/'sitemap.xml').read_text()
            page=(home/'index.html').read_text()
            for slug in SLUGS:
                path=home/'tools'/slug
                self.assertTrue((path/'index.html').is_file(),slug)
                self.assertTrue((path/'app.js').is_file(),slug)
                self.assertIn('https://abreda.com/tools/'+slug+'/',sitemap)
                self.assertIn('https://abreda.com/tools/'+slug+'/',page)
            admin=Path(base)/'admin'
            prepare('toolbox-admin',admin)
            data=json.loads((admin/'sites-catalog.json').read_text())
            for slug in SLUGS:
                sites=[x for x in data['sites'] if x['slug']==slug]
                self.assertEqual(len(sites),1)
                self.assertEqual(sites[0]['url'],'https://abreda.com/tools/'+slug+'/')
    def test_traffic_manifest(self):
        manifest=json.loads((ROOT/'site-factory'/'ops'/'visit-sites.json').read_text())
        for slug in SLUGS:
            matches=[s for s in manifest['sites'] if s['siteId']=='tb-'+slug]
            self.assertEqual(len(matches),1)
            self.assertEqual(matches[0]['url'],'https://abreda.com/tools/'+slug+'/')
if __name__=='__main__':unittest.main()
