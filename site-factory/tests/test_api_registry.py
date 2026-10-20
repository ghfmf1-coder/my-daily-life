import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

BASE = Path(__file__).resolve().parents[1] / "api-registry"
spec = importlib.util.spec_from_file_location("api_registry_validator", BASE / "validate.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class RegistryTests(unittest.TestCase):
    def test_inventory(self):
        self.assertGreaterEqual(module.validate(), 5)

    def test_reject_unverified_connected(self):
        data = json.loads((BASE / "providers.json").read_text(encoding="utf-8"))
        data["providers"][0]["status"] = "connected"
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / "providers.json"
            file.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(AssertionError):
                module.validate(file)

    def test_reject_duplicate(self):
        data = json.loads((BASE / "providers.json").read_text(encoding="utf-8"))
        data["providers"].append(dict(data["providers"][0]))
        with tempfile.TemporaryDirectory() as temp:
            file = Path(temp) / "providers.json"
            file.write_text(json.dumps(data), encoding="utf-8")
            with self.assertRaises(AssertionError):
                module.validate(file)

if __name__ == "__main__":
    unittest.main()
