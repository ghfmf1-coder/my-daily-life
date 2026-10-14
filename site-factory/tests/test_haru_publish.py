"""Ensure Cloudflare always ships the genuine localized assets."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
class HaruhankanPublishTest(unittest.TestCase):
    def test_cloudflare_dist_whitelist_includes_en_and_favicon(self):
        build=(ROOT/'build-cloudflare.sh').read_text()
        for text in ('dist/en/index.html','dist/en/app/','dist/favicon.ico',
                     'node --check en/app/translate.js','prepare_seo.py'):
            self.assertIn(text,build)
    def test_seo_preserves_bilingual_urls(self):
        seo=(ROOT/'prepare_seo.py').read_text()
        self.assertIn("['en/']",seo)
        self.assertIn("Disallow: /en/app/",seo)
        self.assertIn("'x-default'",seo)
if __name__=='__main__':unittest.main()
