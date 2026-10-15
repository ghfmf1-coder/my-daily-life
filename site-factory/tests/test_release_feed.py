"""RSS releases are readable, locale-correct, non-spam, and contain no admin/private tools."""
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
import marketing
from release_feed import generate_feed
class ReleaseFeedTests(unittest.TestCase):
    def test_actual_tool_bilingual_feed(self):
        items=marketing.build_packets()
        ko=ET.fromstring(generate_feed(items,"ko"))
        en=ET.fromstring(generate_feed(items,"en"))
        self.assertEqual(ko.tag,"rss")
        self.assertEqual(en.findtext("./channel/language"),"en")
        links=[x.findtext("link") for x in en.findall("./channel/item")]
        self.assertIn("https://csv.abreda.com/en/",links)
        self.assertIn("https://my-daily-life.pages.dev/en/",links)
        self.assertFalse(any("toolbox-admin" in x or "deployment-check" in x for x in links))
        self.assertEqual(len(links),len(set(links)))
        self.assertTrue(all(e.find("guid").get("isPermaLink")=="true" for e in en.findall("./channel/item")))
        # RSS GUIDs must not change solely because branding moves to abreda.com.
        csv=next(e for e in en.findall("./channel/item") if e.findtext("link")=="https://csv.abreda.com/en/")
        self.assertEqual(csv.findtext("guid"),"https://tb-csv-merge-studio.pages.dev/en/")
    def test_social_post_is_below_bluesky_limit(self):
        for lang in ("ko","en"):
            root=ET.fromstring(generate_feed(marketing.build_packets(),lang))
            for item in root.findall("./channel/item"):
                title=item.findtext("title") or ""
                desc=item.findtext("description") or ""
                url=item.findtext("link") or ""
                self.assertLessEqual(len(title + " " + desc + " " + url),280,
                                     f"too long for social auto-post: {url}")
    def test_syndication_uses_stable_guid_not_a_new_id_per_build(self):
        x=marketing.build_packets()
        self.assertEqual(generate_feed(x,"ko"),generate_feed(x,"ko"))
        self.assertRaises(ValueError,generate_feed,x,"xx")
    def test_pending_new_site_can_be_publicly_listed_without_fake_copy(self):
        data={"sites":[{"slug":"new-tool","title":"새 도구","description":"실제 사용자 설명","url":"https://tb-new-tool.pages.dev/",
                         "langs":["ko","en"],"copy":{}}]}
        root=ET.fromstring(generate_feed(data,"en"))
        entry=root.find("./channel/item")
        self.assertEqual(entry.findtext("description"),"실제 사용자 설명")
        self.assertIsNone(entry.find("pubDate"))
if __name__=='__main__':unittest.main()
