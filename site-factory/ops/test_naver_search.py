import unittest
from naver_search_setup import urls_from_xml,key_for,canonical_entries
class PublicDiscoveryTests(unittest.TestCase):
    def test_only_public_same_origin_urls_are_submitted(self):
        xml='<urlset>'+''.join('<url><loc>'+u+'</loc></url>' for u in ['https://tb-example.pages.dev/','https://tb-example.pages.dev/en/','https://other.example/','http://tb-example.pages.dev/','https://tb-example.pages.dev/admin/','https://tb-example.pages.dev/api/report','https://tb-example.pages.dev/?private=1','https://user@tb-example.pages.dev/','https://tb-example.pages.dev:443/'])+'</urlset>'
        self.assertEqual(urls_from_xml(xml,'https://tb-example.pages.dev/'),['https://tb-example.pages.dev/','https://tb-example.pages.dev/en/'])
    def test_no_empty_or_html_sitemap_is_silently_accepted(self):
        for xml in ['<html><loc>https://tb-example.pages.dev/</loc></html>','<urlset/>','<sitemapindex/>']:
            with self.assertRaises(ValueError):urls_from_xml(xml,'https://tb-example.pages.dev/')
    def test_only_confirmed_same_project_alias_is_collapsed(self):
        from unittest.mock import patch
        config={'approved':True,'project':'tb-card','canonical_url':'https://card.abreda.com'}
        roots={'https://tb-card.pages.dev/':'tb-card','https://card.abreda.com/':'tb-card','https://other.pages.dev/':'other'}
        original=roots.copy()
        with patch('naver_search_setup.site_list',return_value=['card']),patch('naver_search_setup.read_site',return_value=(config,None)):
            resolved,aliases=canonical_entries(roots)
            self.assertNotIn('https://tb-card.pages.dev/',resolved)
            self.assertEqual(aliases,{'https://tb-card.pages.dev/':'https://card.abreda.com/'})
            self.assertEqual(roots,original)
            self.assertIn('https://tb-card.pages.dev/',canonical_entries({'https://tb-card.pages.dev/':'tb-card'})[0])
            roots['https://card.abreda.com/']='different-project'
            self.assertEqual(canonical_entries(roots)[1],{})

    def test_proof_key_is_stable_and_site_specific(self):
        self.assertEqual(key_for('https://a.example/'),key_for('https://a.example/'))
        self.assertNotEqual(key_for('https://a.example/'),key_for('https://b.example/'))
if __name__=='__main__':unittest.main()
