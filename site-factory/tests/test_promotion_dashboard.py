"""The promotion dashboard is gated and does not auto-post externally."""
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[2]
class PromotionDashboardTests(unittest.TestCase):
 def test_promotion_panel_only_after_owner_auth(self):
  base=ROOT/'site-factory/sites/toolbox-admin/public'
  html=(base/'index.html').read_text(encoding='utf8')
  app=(base/'app.js').read_text(encoding='utf8')
  self.assertIn('id="adminGate"',html)
  self.assertIn('data-view="promotion"',html)
  self.assertIn("promotion:promotionView",app)
  self.assertIn("function copyPromotion",app)
  self.assertIn("/promotion-packets.json",app)
  self.assertNotIn("autoPostToReddit",app)
if __name__=='__main__':unittest.main()
