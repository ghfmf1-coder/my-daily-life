"""Brand-only release invariants: do not rename domain, projects or user data."""
import json,unittest,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OLD=("작은도구함","작은 도구함","Small Toolbox","SMALL TOOLBOX")
class AbredaBrandTests(unittest.TestCase):
    def test_all_published_html_uses_abreda(self):
        paths=sorted((ROOT/"site-factory"/"sites").glob("*/public/**/*.html"))+sorted((ROOT/"work-sites").glob("*/public/index.html"))
        self.assertGreaterEqual(len(paths),100)
        for path in paths:
            s=path.read_text(encoding="utf-8")
            with self.subTest(path=str(path.relative_to(ROOT))):
                for phrase in OLD:self.assertNotIn(phrase,s)
                if re.search(r'<title>[^<]+</title>',s):
                    self.assertTrue("ABREDA" in s or "아브레다" in s, "new brand missing in "+str(path))
    def test_keep_existing_site_ids_and_domains(self):
        configs=list((ROOT/"site-factory"/"sites").glob("*/site.json"))
        self.assertGreaterEqual(len(configs),40)
        for f in configs:
            j=json.loads(f.read_text())
            with self.subTest(site=j["slug"]):
                self.assertTrue(j["project"].startswith("tb-"))
                self.assertNotIn("아브레다",j["project"])
                self.assertNotIn("ABREDA",j["project"])
        from sys import path as sys_path
        sys_path.insert(0,str(ROOT/"site-factory"/"scripts"))
        from factory import NATIVE_ROOT_TOOLS
        self.assertEqual(len(NATIVE_ROOT_TOOLS),20)
    def test_canonical_unchanged_for_main_and_english_hub(self):
        for sub,link in (("index.html","https://abreda.com/"),("en/index.html","https://abreda.com/en/")):
            from tempfile import TemporaryDirectory
            from factory import prepare
            with TemporaryDirectory() as tmp:
                prepare('toolbox-hub',Path(tmp))
                doc=(Path(tmp)/sub).read_text(encoding='utf-8')
            self.assertIn('rel="canonical" href="'+link+'"',doc)
            self.assertIn("ABREDA" if sub.startswith("en") else "아브레다",doc)
if __name__=="__main__":unittest.main()
