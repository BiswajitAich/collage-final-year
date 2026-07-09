from __future__ import annotations

import json
from typing import Any, Optional


DEFAULT_FAKE_METADATA: dict[str, str] = {}


class VariableTemplater:
    def __init__(self, metadata: str):
        self.variables = {"metadata": self._parse_metadata(metadata)}

    def _parse_metadata(self, metadata: str) -> dict[str, Any]:
        try:
            value = json.loads(metadata)
            if isinstance(value, dict):
                merged = dict(DEFAULT_FAKE_METADATA)
                merged.update(value)
                return merged
            return dict(DEFAULT_FAKE_METADATA)
        except json.JSONDecodeError:
            return dict(DEFAULT_FAKE_METADATA)

    def render(self, template: str, extra: Optional[dict[str, str]] = None) -> str:
        metadata = self.variables["metadata"]
        rendered = template.replace("{{user_id}}", str(metadata.get("user_id", "")))
        rendered = rendered.replace(
            "{{caller_phone_number}}",
            str(metadata.get("caller_phone_number", "")),
        )
        rendered = rendered.replace(
            "{{customer_id}}",
            str(metadata.get("customer_id", "")),
        )
        rendered = rendered.replace(
            "{{user_name}}",
            str(metadata.get("name", "")),
        )
        rendered = rendered.replace(
            "{{tools_summary}}",
            extra.get("tools_summary", "") if extra else "",
        )
        return rendered
