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

class DomainRoutePreservation(unittest.TestCase):
    def test_historical_ledger_cannot_restore_old_primary(self):
        from naver_search_setup import preserve_domain_routes
        mapped={'tb-example':{'siteId':'tb-example','url':'https://tb-example.pages.dev/','origins':['https://tb-example.pages.dev']},'unrelated':{'url':'https://other.example/'}}
        routes=[{'slug':'example','old_url':'https://tb-example.pages.dev/','ko_url':'https://abreda.com/tools/example/'}]
        updated=preserve_domain_routes(mapped,routes)
        self.assertEqual(updated['tb-example']['url'],routes[0]['ko_url'])
        self.assertEqual(updated['tb-example']['origins'],['https://tb-example.pages.dev'])
        self.assertEqual(updated['unrelated']['url'],'https://other.example/')

class MigratedDomainTests(unittest.TestCase):
    def test_real_routes_preserve_history_and_require_hub_and_project(self):
        import json
        from naver_search_setup import ROOT
        route=json.loads((ROOT/'site-factory/ops/domain-routes.json').read_text())['routes'][0]
        entries={route['old_url']:route['project'],'https://abreda.com/':'tb-toolbox-hub'}
        before=entries.copy()
        active,aliases=canonical_entries(entries)
        self.assertEqual(entries,before)
        self.assertEqual(aliases[route['old_url']],route['ko_url'])
        self.assertEqual(active,{'https://abreda.com/':'tb-toolbox-hub'})
        self.assertIn(route['old_url'],canonical_entries({route['old_url']:route['project']})[0])
        entries[route['old_url']]='unrelated-project'
        self.assertIn(route['old_url'],canonical_entries(entries)[0])
