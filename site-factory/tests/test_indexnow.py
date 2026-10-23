"""IndexNow never notifies Google, private pages, foreign hosts or non-indexed URLs."""
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SOURCE=Path(__file__).resolve().parents[1]/"scripts"/"indexnow.py"
spec=importlib.util.spec_from_file_location("small_toolbox_indexnow",SOURCE)
m=importlib.util.module_from_spec(spec)
sys.modules[spec.name]=m
spec.loader.exec_module(m)

def sitemap(urls):
    return '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+''.join("<url><loc>"+u+"</loc></url>" for u in urls)+'</urlset>'

class FakeResponse:
    status=202
    def __enter__(self):return self
    def __exit__(self,*_):pass

class IndexNowTests(unittest.TestCase):
    def test_excludes_owner_and_tech(self):
        with tempfile.TemporaryDirectory() as d:
            for slug in ('toolbox-admin','deployment-check'):
                self.assertIsNone(m.generate_verification(Path(d),{'slug':slug,'approved':True}))
                self.assertFalse(m.indexable_urls(Path(d),'https://tb-'+slug+'.pages.dev',{'slug':slug,'approved':True}))
            self.assertIsNone(m.generate_verification(Path(d),{'slug':'draft','approved':False}))
    def test_public_key_and_urls(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);base="https://tb-sample.pages.dev"
            data={'slug':'sample','approved':True}
            p.joinpath("sitemap.xml").write_text(sitemap([
                base+"/",base+"/en/",base+"/app/",base+"/",
                "https://different.pages.dev/",base+"/?query=1"]))
            key=m.generate_verification(p,data)
            self.assertEqual(len(key),32)
            self.assertEqual((p/(key+".txt")).read_text(),key)
            self.assertEqual(m.indexable_urls(p,base,data),[base+"/",base+"/en/"])
            calls=[]
            def sender(req,timeout):
                calls.append(req)
                return FakeResponse()
            result=m.ping_indexnow(p,base,data,key,request=sender)
            self.assertEqual(result['status'],'received')
            self.assertEqual(result['count'],2)
            self.assertEqual(calls[0].full_url,'https://api.indexnow.org/indexnow')
            self.assertEqual(__import__('json').loads(calls[0].data)['urlList'],[base+"/",base+"/en/"])
    def test_naver_uses_official_endpoint_and_rejects_other_providers(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);base="https://tb-sample.pages.dev";info={'slug':'sample','approved':True}
            p.joinpath("sitemap.xml").write_text(sitemap([base+"/"]))
            key=m.generate_verification(p,info);calls=[]
            def sender(req,timeout):
                calls.append(req.full_url);return FakeResponse()
            result=m.ping_indexnow(p,base,info,key,request=sender,provider='naver')
            self.assertEqual(calls,['https://searchadvisor.naver.com/indexnow'])
            self.assertEqual(result['keyValidation'],'pending')
            self.assertEqual(result['indexing'],'unknown')
            with self.assertRaises(ValueError):m.ping_indexnow(p,base,info,key,request=sender,provider='untrusted')
    def test_skip_without_verified_key(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d);p.joinpath("sitemap.xml").write_text(sitemap(["https://tb-sample.pages.dev/"]))
            self.assertEqual(m.ping_indexnow(p,"https://tb-sample.pages.dev",{'slug':'sample','approved':True},None)['status'],'skipped')
if __name__=='__main__':unittest.main()
