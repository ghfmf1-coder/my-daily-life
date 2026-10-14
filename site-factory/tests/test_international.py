"""Regression tests for bilingual tools, reciprocal hreflang and ethical indexable URLs."""
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import factory

REPO=Path(__file__).resolve().parents[2]
class InternationalizationTests(unittest.TestCase):
    def test_public_tool_locales_and_search_tags(self):
        for slug in ('novel-planner', 'manuscript-lens', 'csv-merge-studio'):
            with self.subTest(slug=slug), tempfile.TemporaryDirectory() as d:
                config,origin=factory.prepare(slug,Path(d)/'build')
                out=Path(d)/'build'
                self.assertEqual(config['locales'],['ko','en'])
                ko=(out/'index.html').read_text(encoding='utf-8')
                en=(out/'en/index.html').read_text(encoding='utf-8')
                for label,html in [('ko',ko),('en',en)]:
                    self.assertIn(f'lang="{label}"',html)
                    self.assertIn('hreflang="ko"',html)
                    self.assertIn('hreflang="en"',html)
                    self.assertIn('hreflang="x-default"',html)
                    self.assertIn('rel="canonical"',html)
                self.assertIn(f'href="{origin}/"',ko)
                self.assertIn(f'href="{origin}/en/"',en)
                self.assertIn('href="/en/"',ko)
                self.assertIn('href="/"',en)
                sitemap=(out/'sitemap.xml').read_text(encoding='utf-8')
                self.assertIn(f'<loc>{origin}/</loc>',sitemap)
                self.assertIn(f'<loc>{origin}/en/</loc>',sitemap)
                self.assertNotIn('<loc>'+origin+'/en/index.html</loc>',sitemap)
                self.assertIn('href="../favicon.svg"',en)
    def test_internal_sites_not_indexed(self):
        for slug in ('toolbox-admin','deployment-check'):
            with self.subTest(slug=slug), tempfile.TemporaryDirectory() as d:
                factory.prepare(slug,Path(d)/'build')
                sitemap=(Path(d)/'build/sitemap.xml').read_text(encoding='utf-8')
                self.assertNotIn('<url>',sitemap)
    def test_haruhankan_english_and_sitemap(self):
        ko=(REPO/'index.html').read_text(encoding='utf-8')
        en=(REPO/'en/index.html').read_text(encoding='utf-8')
        self.assertIn('hreflang="en"',ko)
        self.assertIn('hreflang="ko"',en)
        self.assertIn('https://my-daily-life.pages.dev/en/',(REPO/'sitemap.xml').read_text())
        self.assertIn('Disallow: /en/app/',(REPO/'robots.txt').read_text())
        self.assertIn('href="/en/app/"',en)
        self.assertIn('src="./translate.js"',(REPO/'en/app/index.html').read_text())
        self.assertTrue((REPO/'en/app/translate.js').is_file())
if __name__=='__main__': unittest.main()
