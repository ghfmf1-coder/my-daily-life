import unittest
from naver_search_setup import urls_from_xml,key_for
class PublicDiscoveryTests(unittest.TestCase):
    def test_only_public_same_origin_urls_are_submitted(self):
        xml='<urlset>'+''.join('<url><loc>'+u+'</loc></url>' for u in ['https://tb-example.pages.dev/','https://tb-example.pages.dev/en/','https://other.example/','http://tb-example.pages.dev/','https://tb-example.pages.dev/admin/','https://tb-example.pages.dev/api/report','https://tb-example.pages.dev/?private=1','https://user@tb-example.pages.dev/','https://tb-example.pages.dev:443/'])+'</urlset>'
        self.assertEqual(urls_from_xml(xml,'https://tb-example.pages.dev/'),['https://tb-example.pages.dev/','https://tb-example.pages.dev/en/'])
    def test_no_empty_or_html_sitemap_is_silently_accepted(self):
        for xml in ['<html><loc>https://tb-example.pages.dev/</loc></html>','<urlset/>','<sitemapindex/>']:
            with self.assertRaises(ValueError):urls_from_xml(xml,'https://tb-example.pages.dev/')
    def test_proof_key_is_stable_and_site_specific(self):
        self.assertEqual(key_for('https://a.example/'),key_for('https://a.example/'))
        self.assertNotEqual(key_for('https://a.example/'),key_for('https://b.example/'))
if __name__=='__main__':unittest.main()
