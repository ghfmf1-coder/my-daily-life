import unittest, subprocess, json, sys, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'site-factory'/'scripts'))
from factory import prepare, validate_site
NEW=["image-compress-lab","pdf-page-workshop","bulk-file-renamer","room-layout-planner","quote-document-maker","warranty-deadline-tracker","share-qr-card","seller-profit-math","color-contrast-audit","document-scan-studio"]
class SecondTen(unittest.TestCase):
    def test_source_schema_and_javascript(self):
        for slug in NEW:
            with self.subTest(slug=slug):
                cfg=validate_site(slug,require_approval=True)
                self.assertEqual(cfg['project'],'tb-'+slug)
                self.assertEqual(cfg['deploy_mode'],'hub_only')
                src=ROOT/'site-factory'/'sites'/slug/'public'
                subprocess.run(['node','--check',str(src/'app.js')],check=True,capture_output=True)
                html=(src/'index.html').read_text()
                self.assertIn('data-toolbox-site="tb-'+slug+'"',html)
                self.assertIn('./app.js',html)
                self.assertIn('name="description"',html)
        for slug in ['image-compress-lab','bulk-file-renamer']:
            subprocess.run(['node','--check',str(ROOT/'site-factory'/'sites'/slug/'public'/'zipstore.js')],check=True,capture_output=True)
    def test_hub_and_admin_output(self):
        with tempfile.TemporaryDirectory() as directory:
            hub=Path(directory)/'hub'
            prepare('toolbox-hub',hub)
            index=(hub/'index.html').read_text()
            self.assertIn('rel="canonical" href="https://abreda.com/"',index)
            self.assertNotIn('group-order-summary//',index)
            self.assertIn('rel="canonical" href="https://abreda.com/en/"',(hub/'en/index.html').read_text())
            xml=(hub/'sitemap.xml').read_text()
            for slug in NEW:
                with self.subTest(slug=slug):
                    addr='https://abreda.com/tools/'+slug+'/'
                    self.assertIn(addr,index)
                    self.assertIn(addr,xml)
                    self.assertTrue((hub/'tools'/slug/'index.html').is_file())
                    self.assertTrue((hub/'tools'/slug/'app.js').is_file())
            admin=Path(directory)/'admin'
            prepare('toolbox-admin',admin)
            catalog=json.loads((admin/'sites-catalog.json').read_text())['sites']
            for slug in NEW:
                matches=[s for s in catalog if s['slug']==slug]
                self.assertEqual(len(matches),1)
                self.assertEqual(matches[0]['url'],'https://abreda.com/tools/'+slug+'/')
    def test_new_tools_cannot_create_standalone_projects(self):
        output=subprocess.check_output([sys.executable,str(ROOT/'site-factory/scripts/targets.py'),'--site','image-compress-lab'],text=True)
        matrix=json.loads(next(line[7:] for line in output.splitlines() if line.startswith('MATRIX=')))
        self.assertEqual(matrix,['toolbox-hub','toolbox-admin'])
        run=subprocess.run([sys.executable,str(ROOT/'site-factory/scripts/deploy_site.py'),'--site','image-compress-lab','--dry-run'],capture_output=True,text=True)
        self.assertNotEqual(run.returncode,0)
        self.assertIn('HUB_ONLY',run.stderr)

    def test_visit_manifest(self):
        m=json.loads((ROOT/'site-factory'/'ops'/'visit-sites.json').read_text())['sites']
        for slug in NEW:
            matches=[s for s in m if s['siteId']=='tb-'+slug]
            self.assertEqual(len(matches),1)
            self.assertEqual(matches[0]['url'],'https://abreda.com/tools/'+slug+'/')
if __name__=='__main__':unittest.main()
