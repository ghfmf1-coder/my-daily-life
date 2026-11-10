"""Source-backed 70-tool bilingual release gate. No simulated visitor data."""
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'site-factory/scripts'))
from factory import prepare,NATIVE_ROOT_TOOLS,validate_site
from bilingual_en import EDITORIAL,NATIVE,generate_work,render_native
class BilingualFleetTests(unittest.TestCase):
    def test_complete_metadata_without_duplicates(self):
        self.assertEqual(set(NATIVE_ROOT_TOOLS),NATIVE)
        self.assertEqual(len(EDITORIAL),50)
        self.assertEqual(len(set(EDITORIAL)),len(EDITORIAL))
        for slug in NATIVE:
            cfg=validate_site(slug,True)
            self.assertEqual(cfg.get('locales'),['ko','en'])
            self.assertTrue(cfg.get('generated_en'))
        for slug,e in EDITORIAL.items():
            with self.subTest(slug=slug):
                self.assertEqual(len(e),5)
                self.assertTrue(all(isinstance(x,str) and len(x)>15 for x in e[1:]))
                self.assertNotRegex(' '.join(e),r'[가-힣]')
    def test_native_english_pages_and_sitemap(self):
        with tempfile.TemporaryDirectory() as d:
            out=Path(d)/'hub'
            prepare('toolbox-hub',out)
            site=(out/'en/index.html').read_text(encoding='utf-8')
            sitemap=(out/'sitemap.xml').read_text()
            for slug in sorted(NATIVE):
                with self.subTest(slug=slug):
                    ko=out/'tools'/slug/'index.html'
                    en=out/'en'/'tools'/slug/'index.html'
                    self.assertTrue(ko.is_file())
                    self.assertTrue(en.is_file())
                    doc=en.read_text(encoding='utf8')
                    self.assertIn('<html lang="en"',doc)
                    self.assertIn(EDITORIAL[slug][0],doc)
                    self.assertIn(EDITORIAL[slug][4],doc)
                    self.assertIn('href="https://abreda.com/en/tools/'+slug+'/"',doc)
                    self.assertIn('hreflang="ko"',doc)
                    self.assertIn('hreflang="en"',doc)
                    self.assertIn('src="./app.js"',doc)
                    self.assertTrue((en.parent/'app.js').is_file())
                    self.assertTrue((en.parent/'runtime-translate.js').is_file())
                    self.assertIn('https://abreda.com/en/tools/'+slug+'/',sitemap)
                    self.assertIn('https://abreda.com/en/tools/'+slug+'/',site)
            self.assertTrue((out/'en/new-tools/index.html').is_file())
            self.assertIn('https://abreda.com/en/new-tools/',sitemap)
    def test_thirty_work_tools_render_real_english_forms(self):
        slugs=sorted(set(EDITORIAL)-NATIVE)
        self.assertEqual(len(slugs),30)
        for slug in slugs:
            with self.subTest(slug=slug):
                source=(ROOT/'work-sites'/slug/'public/index.html').read_text()
                localized=generate_work(slug,write=False)
                self.assertIn('lang="en"',localized)
                self.assertIn(EDITORIAL[slug][0],localized)
                self.assertIn(EDITORIAL[slug][2],localized)
                self.assertIn('hreflang="ko"',localized)
                self.assertIn('hreflang="en"',localized)
                self.assertIn('rel="canonical" href="https://tb-'+slug+'.pages.dev/en/"',localized)
                self.assertIn('runtime-translate.js',localized)
                for match in re.findall(r'id="(file\d+|run|save|form|orderFile|shipFile|download)"',source):
                    self.assertIn('id="'+match+'"',localized)
                self.assertEqual(len(re.findall(r'<script(?![^>]*src)[^>]*>',source)),len(re.findall(r'<script(?![^>]*src)[^>]*>',localized)))
if __name__=='__main__':unittest.main()
