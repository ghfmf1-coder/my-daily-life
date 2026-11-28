import json, subprocess, unittest, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from factory import validate_site,prepare
from tempfile import TemporaryDirectory
from urllib.parse import urlsplit
from html.parser import HTMLParser
CASES=[{"slug":"unit-price-calculator","cases":[[{"a":5000,"aq":500,"b":7200,"bq":900,"unit":100},[1000,800,"B"]]]},{"slug":"discount-coupon-calculator","cases":[[{"a":10000,"ar":20,"ac":1000,"as":3000,"b":9000,"br":10,"bc":0,"bs":0},[10000,8100,1900,"B"]]]},{"slug":"business-days-calculator","cases":[[{"start":"2026-11-23","end":"2026-11-29","include":"yes","holidays":"2026-11-25\n2026-11-25\n2026-11-28"},[5,1,4]]]},{"slug":"appliance-energy-calculator","cases":[[{"watts":1000,"hours":3,"days":30,"rate":200},[3,90,18000]]]},{"slug":"text-to-columns-converter","cases":[[{"input":"\"a,b\",c\nx,,y","delimiter":"comma"},["a,b\tc\nx\t\ty"]]]},{"slug":"dimensional-weight-calculator","cases":[[{"l":40,"w":30,"h":20,"kg":3,"divisor":5000},[24000,4.8,4.8]]]},{"slug":"recipe-serving-calculator","cases":[[{"from":2,"to":5,"items":"flour,200,g\negg,2,item"},[2.5,500,5]]]},{"slug":"file-transfer-time-calculator","cases":[[{"size":1,"unit":"GB","speed":100},[80,1.3333333333333333,0.022222222222222223]]]},{"slug":"fuel-cost-calculator","cases":[[{"distance":150,"economy":15,"price":1700,"mode":"metric"},[10,17000]]]}]
class ConsumerTools(unittest.TestCase):
    def test_draft_sources_and_core_examples(self):
        for spec in CASES:
            slug=spec['slug']
            with self.subTest(slug=slug):
                validate_site(slug)
                p=ROOT/'sites'/slug/'public'/'app.js'
                subprocess.run(['node','--check',str(p)],check=True,capture_output=True)
                code="const assert=require('node:assert/strict');const {compute}=require(process.argv[1]);for(const [v,want] of JSON.parse(process.argv[2])){assert.throws(()=>compute({}));const got=compute(v).map(r=>r[1]);assert.equal(got.length,want.length);got.forEach((x,i)=>typeof x==='number'?assert.ok(Math.abs(x-want[i])<1e-8):assert.equal(x,want[i]));}"
                subprocess.run(['node','-e',code,str(p),json.dumps(spec['cases'])],check=True,capture_output=True)
    def test_pdf_source_syntax(self):
        validate_site('pdf-compressor')
        subprocess.run(['node','--check',str(ROOT/'sites'/'pdf-compressor'/'public'/'app.js')],check=True,capture_output=True)

    def test_approved_tools_and_localized_photo_sets(self):
        from blog_articles import load
        from blog_magazine import photo_set
        released={s['slug'] for s in CASES}|{'pdf-compressor'}
        selected=[p for p in load() if p.get('tool') in released]
        self.assertEqual({p['tool'] for p in selected},released)
        ids=[]
        with TemporaryDirectory() as tmp:
            out=Path(tmp)/'hub'
            prepare('toolbox-hub',out)
            sitemap=(out/'sitemap.xml').read_text()
            for post in selected:
                for lang,prefix in [('ko',''),('en','en/')]:
                    photos=photo_set(post,lang)
                    self.assertEqual(len(photos),3)
                    ids.extend(q['url'].split('?')[0] for q in photos)
                    page=out/prefix/'blog'/post['slug']/'index.html'
                    html=page.read_text()
                    for photo in photos:self.assertIn(photo['url'].split('?')[0],html)
                    tool=out/prefix/'tools'/post['tool']/'index.html'
                    self.assertTrue(tool.is_file())
                    self.assertIn('https://abreda.com/'+prefix+'tools/'+post['tool']+'/',sitemap)
            self.assertTrue((out/'tools/pdf-compressor/index.html').exists())
        self.assertEqual(len(ids),len(set(ids)))

    def test_all_new_editorial_pairs_have_unique_images_and_correct_language_links(self):
        from blog_articles import load
        from blog_magazine import head,photo_set
        posts=[p for p in load() if p['published']>='2026-11-27']
        self.assertEqual(len(posts),14)
        ids=[]
        for post in posts:
            for lang in ('ko','en'):
                photos=photo_set(post,lang)
                self.assertEqual(len(photos),3)
                ids.extend(q['url'].split('?')[0] for q in photos)
                markup=head(lang,post)
                if post.get('independent_locales'):
                    self.assertNotIn('hreflang=',markup)
                else:
                    self.assertIn('hreflang="ko"',markup)
                    self.assertIn('hreflang="en"',markup)
        self.assertEqual(len(ids),len(set(ids)))
        self.assertEqual(len([p for p in posts if p.get('independent_locales')]),2)
