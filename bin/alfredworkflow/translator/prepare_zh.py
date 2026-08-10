#!/usr/bin/env python3
import json
import os
import sys
import urllib.error

import translate


def main():
    query = sys.argv[1] if len(sys.argv) > 1 else ""
    text = query.strip()
    if not text:
        print(json.dumps({
            "items": [{
                "title": "zh: translate to zh-TW",
                "subtitle": "Type text after zh",
                "arg": "",
                "valid": False,
                "variables": {"target_lang": "zh-TW"},
            }]
        }, ensure_ascii=False))
        return

    try:
        provider = os.environ.get("provider", "").strip().lower() or "shortcut"
        result = translate.translate(text, "zh-TW", provider) or ""
    except urllib.error.HTTPError as exc:
        result = translate.error_message(exc)
        is_error = True
    except Exception as exc:
        result = str(exc)
        is_error = True
    else:
        is_error = False

    display = " ".join(result.split())

    item = {
        "title": display or "No translation",
        "subtitle": "Error" if is_error else "Press Return to copy.",
        "arg": result,
        "valid": not is_error,
        "text": {
            "copy": result,
            "largetype": result,
        },
        "variables": {"target_lang": "zh-TW"},
    }
    print(json.dumps({"items": [item]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
