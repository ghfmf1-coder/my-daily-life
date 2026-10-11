import json
import os
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
from unittest.mock import patch
import build

class BuildTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with patch.dict(os.environ, {'SITE_URL':'https://tools.example.com'}):
            build.main()
        cls.d=Path(__file__).resolve().parent.parent/'dist'

    def test_home_discovers_both_tools(self):
        home=(self.d/'index.html').read_text()
        self.assertIn('글자 수 계산기',home)
        self.assertIn('퍼센트 계산기',home)
        self.assertIn('https://tools.example.com/',home)

    def test_pages_widgets_exist(self):
        for slug in ('word-count','percentage'):
            self.assertTrue((self.d/f'tools/{slug}/index.html').exists())
            self.assertTrue((self.d/f'tools/{slug}/widget.js').exists())

    def test_sitemap_has_canonical_routes(self):
        p=self.d/'sitemap.xml'
        root=ET.parse(p).getroot()
        ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls=[e.text for e in root.findall('s:url/s:loc',ns)]
        self.assertIn('https://tools.example.com/',urls)
        self.assertIn('https://tools.example.com/tools/word-count/',urls)
        self.assertEqual(len(urls),6)

    def test_no_ads_without_approval(self):
        self.assertFalse((self.d/'ads.txt').exists())
        self.assertNotIn('pagead2.googlesyndication.com',(self.d/'index.html').read_text())

    def test_manifest_counts_tools(self):
        manifest=json.loads((self.d/'manifest.json').read_text())
        self.assertEqual(len(manifest['apps']),2)

    def test_url_validation(self):
        with patch.dict(os.environ,{'SITE_URL':'https://tools.example.com/not-root'}):
            with self.assertRaises(ValueError): build.metadata()

if __name__=='__main__':unittest.main()
