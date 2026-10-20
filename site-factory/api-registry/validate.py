"""Validate API inventory metadata; never handle or print credentials."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ALLOWED = {"researching", "eligible", "blocked", "connected"}
REQUIRED = {"id", "name", "category", "status", "credentials", "requires_billing",
            "docs", "pricing", "commercial_rights", "data_storage_rights",
            "last_verified", "live_test"}
SECRET_FIELD = re.compile(r"(api.?key|secret|token|password|credential_value|private_key)", re.I)
SLUG = re.compile(r"^[a-z][a-z0-9-]{2,59}$")

def validate(path=ROOT / "providers.json"):
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    assert data["schema_version"] == 1
    assert isinstance(data["providers"], list)
    seen = set()
    for entry in data["providers"]:
        assert REQUIRED <= entry.keys(), f"missing fields in {entry.get('id')}"
        assert not any(SECRET_FIELD.search(key) for key in entry if key != "credentials"), "secret-like field name"
        assert SLUG.fullmatch(entry["id"]), "invalid id"
        assert entry["id"] not in seen, "duplicate provider id"
        seen.add(entry["id"])
        assert entry["status"] in ALLOWED, "invalid status"
        assert isinstance(entry["requires_billing"], bool)
        for key in ("docs", "pricing"):
            assert entry[key].startswith("https://"), "official HTTPS reference required"
        if entry["status"] == "connected":
            assert entry["live_test"] and entry["last_verified"], "connected requires dated live test"
        if entry["status"] == "eligible":
            assert entry["last_verified"], "eligible requires verification date"
    return len(seen)

if __name__ == "__main__":
    print(f"Validated {validate()} provider entries (metadata only)")
