"""Protect the first-phase unified-domain migration from homepage fallbacks."""
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import factory

class UnifiedRoutesTests(unittest.TestCase):
    def test_migrated_tool_routes_and_sitemap(self):
        migrated=('csv-column-extractor','csv-empty-row-remover','jsonl-validator',
                  'srt-sdh-cleaner','vtt-cleaner')
        with tempfile.TemporaryDirectory() as tmp:
            factory.prepare('toolbox-hub',Path(tmp)/'build')
            root=Path(tmp)/'build'
            sitemap=(root/'sitemap.xml').read_text(encoding='utf-8')
            for slug in migrated:
                for prefix,lang in (('tools','ko'),('en/tools','en')):
                    url=f'https://abreda.com/{prefix}/{slug}/'
                    page=root/prefix/slug/'index.html'
                    self.assertTrue(page.is_file(),str(page))
                    html=page.read_text(encoding='utf-8')
                    self.assertIn(f'<html lang="{lang}"',html)
                    self.assertIn(f'<link rel="canonical" href="{url}">',html)
                    self.assertIn(f'<loc>{url}</loc>',sitemap)
                    self.assertIn(f'https://abreda.com/tools/{slug}/',html)
                    self.assertIn(f'https://abreda.com/en/tools/{slug}/',html)
                    self.assertNotIn('AUTO_CATALOG_CARDS',html)
            ko=(root/'index.html').read_text(encoding='utf-8')
            en=(root/'en/index.html').read_text(encoding='utf-8')
            for slug in migrated:
                self.assertIn(f'https://abreda.com/tools/{slug}/',ko)
                self.assertIn(f'https://abreda.com/en/tools/{slug}/',en)
