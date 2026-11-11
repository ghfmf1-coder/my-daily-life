"""Test genuine bilingual guides, tool links and future auto-publication gate."""
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase, mock
import json, sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'site-factory/scripts'))
import blog_articles, factory
class BlogTests(TestCase):
    def test_reviewed_articles_have_substantive_unique_editorial(self):
        articles=blog_articles.load()
        self.assertGreaterEqual(len(articles),8)
        self.assertEqual(len({p['slug'] for p in articles}),len(articles))
        linked=[p['tool'] for p in articles if p.get('tool')]
        self.assertEqual(len(set(linked)),len(linked))
        info=[p for p in articles if p['type']=='information']
        self.assertGreaterEqual(len(info),4)
        for post in articles:
            with self.subTest(slug=post['slug']):
                for lang in ('ko','en'):
                    d=post[lang]
                    self.assertGreaterEqual(len(d['steps']),3)
                    self.assertGreater(len(d['problem']),60)
                    self.assertGreater(len(d['alternative']),40)
                    if post['toolURLs'][lang]:
                        self.assertTrue(post['toolURLs'][lang].startswith('https://'))
                        self.assertNotIn('example.com',post['toolURLs'][lang])
                    else:
                        self.assertEqual(post['type'],'information')
                        self.assertTrue(post['sources'])
                    self.assertIn(lang,post['media']['image']['alt'])
                    self.assertIn('images.unsplash.com',post['media']['image']['url'])
    def test_bilingual_generated_articles_have_sitemap_and_links(self):
        with TemporaryDirectory() as tmp:
            out=Path(tmp)/'hub'
            factory.prepare('toolbox-hub',out)
            all_urls=[]
            for locale,prefix in [('ko','blog'),('en','en/blog')]:
                directory=out/prefix
                index=(directory/'index.html').read_text(encoding='utf8')
                self.assertIn('rel="canonical"',index)
                self.assertIn('hreflang="ko"',index)
                self.assertIn('hreflang="en"',index)
                self.assertIn('class="grid"',index)
                self.assertIn('class="featured"',index)
                self.assertIn('id="articleSearch"',index)
                self.assertIn('data-filter="all"',index)
                self.assertIn('images.unsplash.com/photo-',index)
                for post in blog_articles.load():
                    page=directory/post['slug']/'index.html'
                    self.assertTrue(page.is_file(),str(page))
                    text=page.read_text(encoding='utf8')
                    self.assertIn(post[locale]['title'],text)
                    self.assertIn(post[locale]['limits'].replace('&','&amp;'),text)
                    if post['toolURLs'][locale]:self.assertIn(post['toolURLs'][locale],text)
                    else:self.assertIn('id="sources"',text)
                    self.assertIn('property="og:image"',text)
                    self.assertIn('<img',text)
                    self.assertIn('class="hero"',text)
                    self.assertIn('Photo',text) if locale=='en' else self.assertIn('사진 출처:',text)
                    self.assertIn('"@type":"BlogPosting"',text)
                    self.assertIn('href="https://abreda.com/'+prefix+'/'+post['slug']+'/"',text)
                    self.assertIn('href="/'+prefix+'/'+post['slug']+'/"',index)
                    all_urls.append('https://abreda.com/'+prefix+'/'+post['slug']+'/')
            sitemap=(out/'sitemap.xml').read_text(encoding='utf8')
            for url in ['https://abreda.com/blog/','https://abreda.com/en/blog/',*all_urls]:
                self.assertEqual(sitemap.count('<loc>'+url+'</loc>'),1,url)
            source=(out/'index.html').read_text(encoding='utf8')
            self.assertIn('href="/blog/"',source)
            self.assertIn('grid-template-columns:53px minmax(0,1fr)',source)
            english=(out/'en'/'index.html').read_text(encoding='utf8')
            self.assertIn('href="/en/blog/"',english)
            self.assertTrue((out/'tools'/'pdf-page-workshop'/'index.html').is_file())
    def test_draft_not_indexed_and_future_approved_tool_requires_review(self):
        with TemporaryDirectory() as td:
            draft=Path(td)/'test-guide.json'
            draft.write_text(json.dumps({'status':'draft','slug':'draft-example','tool':'pdf-page-workshop'}))
            with mock.patch.object(blog_articles,'CONTENT',Path(td)):
                articles=blog_articles.load()
                self.assertFalse(any(p['slug']=='draft-example' for p in articles))
        with TemporaryDirectory() as td:
            site=Path(td)/'sites'/'new-example';public=site/'public'
            public.mkdir(parents=True)
            cfg={'slug':'new-example','project':'tb-new-example','title':'새 도구 예시','description':'실제 문제를 해결하는 도구',
                 'approved':True,'blog_required':True}
            (site/'site.json').write_text(json.dumps(cfg,ensure_ascii=False),encoding='utf8')
            (public/'index.html').write_text('<!doctype html><html lang="ko"><head><title>New Tool</title><meta name="description" content="Real tool"><meta name="viewport" content="width=device-width"></head><body><main><h1>New Tool</h1></main></body></html>')
            with mock.patch.object(factory,'SITES',Path(td)/'sites'):
                with self.assertRaisesRegex(factory.SiteError,'blog.json is required'):
                    factory.validate_site('new-example')
                (site/'blog.json').write_text(json.dumps({'slug':'new-example-guide','tool':'new-example','status':'draft','ko':{},'en':{}}))
                with self.assertRaisesRegex(factory.SiteError,'reviewed'):
                    factory.validate_site('new-example')
if __name__=='__main__':
    import unittest;unittest.main()
