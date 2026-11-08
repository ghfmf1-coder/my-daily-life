"""GA4 build safeguards; fixture IDs never enter published site configuration."""
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import factory


class AnalyticsBuildTests(unittest.TestCase):
    def test_no_measurement_id_means_no_tag(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'build'
            factory.prepare('toolbox-hub', out)
            for page in out.rglob('*.html'):
                self.assertNotIn('googletagmanager.com/gtag/js', page.read_text())

    def test_verified_config_tags_each_public_page_once(self):
        read = factory.read_site
        def configured(slug, require_approval=False):
            data, directory = read(slug, require_approval)
            if slug == 'toolbox-hub':
                data = dict(data, ga4_measurement_id='G-TESTONLY01')
            return data, directory
        with tempfile.TemporaryDirectory() as tmp, patch.object(factory, 'read_site', configured):
            out = Path(tmp) / 'build'
            factory.prepare('toolbox-hub', out)
            for page in out.rglob('*.html'):
                text = page.read_text()
                self.assertEqual(1, text.count('googletagmanager.com/gtag/js?id=G-TESTONLY01'), str(page))
                self.assertEqual(1, text.count("gtag('config'"), str(page))
                self.assertIn('toolbox-public-traffic.js', text) if '/tools/' in page.as_posix() else None

    def test_private_admin_does_not_receive_tag(self):
        read = factory.read_site
        def configured(slug, require_approval=False):
            data, directory = read(slug, require_approval)
            return dict(data, ga4_measurement_id='G-TESTONLY01'), directory
        with tempfile.TemporaryDirectory() as tmp, patch.object(factory, 'read_site', configured):
            out = Path(tmp) / 'build'
            factory.prepare('toolbox-admin', out)
            for page in out.rglob('*.html'):
                self.assertNotIn('googletagmanager.com/gtag/js', page.read_text())

    def test_numeric_property_id_is_rejected(self):
        original = factory.json.loads
        def configured(text):
            data = original(text)
            if isinstance(data, dict) and data.get('slug') == 'toolbox-hub':
                data['ga4_measurement_id'] = '563183346'
            return data
        with patch.object(factory.json, 'loads', configured):
            with self.assertRaises(factory.SiteError):
                factory.read_site('toolbox-hub')
