"""No network tests for the initial site factory."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
import factory
import deploy_site

class SiteFactoryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.sites=Path(self.temp.name)/'sites'
        self.sites.mkdir()
        self.patch=mock.patch.object(factory, 'SITES', self.sites)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.slug='clean-writer'
        self.site=self.sites/self.slug
        (self.site/'public').mkdir(parents=True)
        self.config={'slug':self.slug,'project':'tb-clean-writer','title':'원고 검사 도구',
            'description':'원고 속 불편한 반복 표현을 확인하는 도구','approved':False,'domain':None,'canonical_url':None}
        self.save()
        self.html='<html><head><title>원고 검사</title><meta name="viewport" content="width=device-width"><meta name="description" content="원고 문장을 검사하는 도구"></head><body><script src="a.js"></script></body></html>'
        (self.site/'public'/'index.html').write_text(self.html,encoding='utf8')
        (self.site/'public'/'a.js').write_text('const x = 1;',encoding='utf8')
    def save(self):
        (self.site/'site.json').write_text(json.dumps(self.config,ensure_ascii=False),encoding='utf8')
    def test_needs_approval(self):
        with self.assertRaisesRegex(factory.SiteError,'승인 전'):
            factory.prepare(self.slug,Path(self.temp.name)/'out')
    def test_prepares_only_public_and_generated_seo(self):
        self.config['approved']=True
        self.save()
        out=Path(self.temp.name)/'out'
        data,url=factory.prepare(self.slug,out)
        self.assertEqual(url,'https://tb-clean-writer.pages.dev')
        self.assertTrue((out/'a.js').is_file())
        self.assertTrue((out/'favicon.svg').is_file())
        self.assertIn('rel="icon"',(out/'index.html').read_text())
        self.assertIn('viewBox="0 0 64 64"',(out/'favicon.svg').read_text())
        self.assertTrue((out/'robots.txt').is_file())
        self.assertIn('tb-clean-writer.pages.dev/',(out/'sitemap.xml').read_text())
        self.assertIn('rel="canonical"',(out/'index.html').read_text())
        self.assertFalse((out/'site.json').exists())
    def test_forbids_missing_asset(self):
        (self.site/'public'/'a.js').unlink()
        with self.assertRaisesRegex(factory.SiteError,'없는 내부 에셋'):
            factory.validate_site(self.slug)
    def test_forbids_secrets(self):
        (self.site/'public'/'.env').write_text('secret=fake')
        with self.assertRaisesRegex(factory.SiteError,'비공개 파일'):
            factory.validate_site(self.slug)
    def test_rejects_path_traversal_and_existing_project(self):
        with self.assertRaises(factory.SiteError):
            factory.validate_name('../outside')
        self.config['project']='my-daily-life'
        self.save()
        with self.assertRaisesRegex(factory.SiteError,'기존 프로젝트 보호'):
            factory.validate_site(self.slug)
    def test_starter_blocked(self):
        self.config['approved']=True
        self.save()
        (self.site/'public'/'index.html').write_text(self.html+'<!-- FACTORY_STARTER_DO_NOT_PUBLISH -->')
        with self.assertRaisesRegex(factory.SiteError,'빈 템플릿'):
            factory.validate_site(self.slug,True)
    def test_canonical_domain_must_match(self):
        self.config['canonical_url']='https://example.com'
        self.save()
        with self.assertRaisesRegex(factory.SiteError,'canonical_url'):
            factory.validate_site(self.slug)
    def test_api_creates_project_only_if_missing(self):
        with mock.patch.object(deploy_site,'request',side_effect=[(404,None),(200,{'name':'tb-clean-writer'})]) as req:
            deploy_site.ensure_project('tb-clean-writer')
            self.assertEqual(req.call_count,2)
        with mock.patch.object(deploy_site,'request',return_value=(200,{'name':'tb-clean-writer'})) as req:
            deploy_site.ensure_project('tb-clean-writer')
            self.assertEqual(req.call_count,1)
    def test_existing_cloudflare_git_link_refused(self):
        with mock.patch.object(deploy_site,'request',return_value=(200,{'source':{'type':'github'}})):
            with self.assertRaisesRegex(deploy_site.CFError,'Git integration'):
                deploy_site.ensure_project('tb-clean-writer')
    def test_domain_is_only_added_if_missing(self):
        with mock.patch.object(deploy_site,'request',side_effect=[(404,None),(200,{'name':'hello.example.com'})]) as req:
            deploy_site.attach_domain('tb-clean-writer','hello.example.com')
            self.assertEqual(req.call_count,2)

if __name__=='__main__':unittest.main()