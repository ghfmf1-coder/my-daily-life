"""Regression checks for real searchable public tool content.
Inspect built native Korean/English pages and original independent site HTML.
"""
import sys
import tempfile
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE / 'scripts'))
import factory
from seo_guides import GUIDES


class ContentQualityTests(unittest.TestCase):
    def test_native_bilingual_content_is_unique_and_visible(self):
        self.assertEqual(len(GUIDES), 21)
        with tempfile.TemporaryDirectory() as root:
            for slug in sorted(GUIDES):
                out = Path(root) / slug
                factory.prepare(slug, out)
                for relative, locale in [('index.html', 'ko'), ('en/index.html', 'en')]:
                    html = (out / relative).read_text(encoding='utf-8')
                    with self.subTest(slug=slug, locale=locale):
                        self.assertIn('lang="' + locale + '"', html)
                        self.assertIn('class="tb-practical-guide"', html)
                        self.assertIn('<title>', html)
                        self.assertIn('name="description"', html)
                        self.assertIn('rel="canonical"', html)
                        self.assertNotIn('noindex', html.split('</head>')[0].lower())
                        guide = html.split('class="tb-practical-guide"', 1)[1].split('</section>', 1)[0]
                        for item in GUIDES[slug][locale]:
                            self.assertIn(item, guide)
                        if locale == 'en':
                            self.assertIn('Important limitations', guide)
                        else:
                            self.assertIn('검사 결과와 한계', guide)

    def test_work_sites_are_distinct_and_describe_actual_scope(self):
        work = BASE.parent / 'work-sites'
        sites = sorted(work.glob('*/public/index.html'))
        self.assertEqual(30, len(sites))
        titles, descriptions = set(), set()
        for path in sites:
            html = path.read_text(encoding='utf-8')
            slug = path.parents[1].name
            with self.subTest(work_site=slug):
                self.assertIn('class="toolbox-real-guide"', html)
                self.assertIn('rel="canonical"', html)
                self.assertIn('content="index,follow"', html)
                self.assertNotIn('content="noindex', html)
                self.assertTrue((path.parent / 'robots.txt').is_file())
                self.assertTrue((path.parent / 'sitemap.xml').is_file())
                self.assertLess(html.index('<form'), html.index('class="toolbox-real-guide"'))
                import re
                title = re.search(r'<title>([^<]+)</title>', html).group(1)
                desc = re.search(r'<meta name="description" content="([^"]+)"', html).group(1)
                self.assertGreaterEqual(len(desc), 25)
                self.assertNotIn(' - 브라우저', desc)
                self.assertNotIn(title, titles)
                self.assertNotIn(desc, descriptions)
                titles.add(title); descriptions.add(desc)


if __name__ == '__main__':
    unittest.main()
