#!/usr/bin/env python3
import json
import os
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request


OPENAI_ENDPOINT = "https://api.openai.com/v1/responses"
DEEPL_PRO_ENDPOINT = "https://api.deepl.com/v2/translate"
DEEPL_FREE_ENDPOINT = "https://api-free.deepl.com/v2/translate"


def notify(title, message):
    try:
        subprocess.run(
            [
                "/usr/bin/osascript",
                "-e",
                f'display notification {json.dumps(message)} with title {json.dumps(title)}',
            ],
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        pass


def extract_text(payload):
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"].strip()

    parts = []
    for output in payload.get("output", []):
        for content in output.get("content", []):
            text = content.get("text")
            if isinstance(text, str):
                parts.append(text)
    return "\n".join(parts).strip()


def error_message(exc):
    body = exc.read().decode("utf-8", "replace")
    if not body:
        return f"HTTP {exc.code}"
    try:
        data = json.loads(body)
    except Exception:
        return body
    return (
        data.get("error", {}).get("message")
        or data.get("message")
        or body
    )


def request_json(url, payload, headers):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def deepl_target(target):
    if target == "zh-TW":
        return "ZH-HANT"
    return "EN-US"


def deepl_endpoint(api_key):
    plan = os.environ.get("deepl_api_plan", "").strip().lower() or "auto"
    if plan == "free" or (plan == "auto" and api_key.endswith(":fx")):
        return DEEPL_FREE_ENDPOINT
    return DEEPL_PRO_ENDPOINT


def translate_with_deepl(source, target):
    api_key = (
        os.environ.get("deepl_api_key", "").strip()
        or os.environ.get("DEEPL_AUTH_KEY", "").strip()
    )
    if not api_key:
        notify("Translate", "Set DeepL API Key in workflow configuration.")
        return None

    payload = {
        "text": [source],
        "target_lang": deepl_target(target),
        "preserve_formatting": True,
    }
    data = request_json(
        deepl_endpoint(api_key),
        payload,
        {
            "Authorization": f"DeepL-Auth-Key {api_key}",
            "Content-Type": "application/json",
        },
    )
    translations = data.get("translations", [])
    if not translations:
        return ""
    return translations[0].get("text", "").strip()


def translate_with_openai(source, target):
    model = os.environ.get("model", "").strip() or "gpt-5-mini"
    api_key = (
        os.environ.get("openai_api_key", "").strip()
        or os.environ.get("OPENAI_API_KEY", "").strip()
    )
    if not api_key:
        notify("Translate", "Set OpenAI API Key in workflow configuration.")
        return None

    if target == "zh-TW":
        target_rule = "Translate into Traditional Chinese as used in Taiwan."
    else:
        target_rule = "Translate into natural American English."

    payload = {
        "model": model,
        "instructions": (
            "You are a translation engine. Auto-detect the source language. "
            f"{target_rule} Return only the translation. Preserve meaning, line breaks, "
            "URLs, code blocks, numbers, names, and formatting when possible."
        ),
        "input": source,
    }
    data = request_json(
        OPENAI_ENDPOINT,
        payload,
        {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    return extract_text(data)


def run_text_command(command, input_text=None, timeout=120):
    return subprocess.run(
        command,
        input=input_text,
        text=True,
        capture_output=True,
        timeout=timeout,
        check=False,
    )


def read_clipboard():
    result = run_text_command(["/usr/bin/pbpaste"], timeout=10)
    return result.stdout if result.returncode == 0 else ""


def write_clipboard(text):
    run_text_command(["/usr/bin/pbcopy"], input_text=text, timeout=10)


def shortcut_name_for_target(target):
    if target == "zh-TW":
        name = os.environ.get("shortcut_zh_name", "").strip()
        return name or os.environ.get("shortcut_name", "").strip() or "Translate Text"
    name = os.environ.get("shortcut_en_name", "").strip()
    return name or os.environ.get("shortcut_name", "").strip() or "Translate Text EN"


def translate_with_shortcut(source, target):
    shortcut_name = shortcut_name_for_target(target)
    input_mode = os.environ.get("shortcut_input_mode", "").strip().lower() or "file"
    if input_mode == "file":
        return translate_with_shortcut_file(source, shortcut_name)

    previous_clipboard = read_clipboard()
    output = ""
    clipboard_after_run = ""

    try:
        write_clipboard(source)
        result = run_text_command(["/usr/bin/shortcuts", "run", shortcut_name])
        output = result.stdout.strip()
        clipboard_after_run = read_clipboard().strip()

        if result.returncode != 0:
            message = (result.stderr or result.stdout or "Shortcut failed.").strip()
            raise RuntimeError(message)
    finally:
        write_clipboard(previous_clipboard)

    if output:
        return output
    if clipboard_after_run and clipboard_after_run != source:
        return clipboard_after_run
    return ""


def translate_with_shortcut_file(source, shortcut_name):
    with tempfile.TemporaryDirectory() as temp_dir:
        input_path = os.path.join(temp_dir, "input.txt")
        output_path = os.path.join(temp_dir, "output.txt")
        with open(input_path, "w", encoding="utf-8") as handle:
            handle.write(source)

        result = run_text_command(
            [
                "/usr/bin/shortcuts",
                "run",
                shortcut_name,
                "--input-path",
                input_path,
                "--output-path",
                output_path,
                "--output-type",
                "public.plain-text",
            ]
        )
        if result.returncode != 0:
            message = (result.stderr or result.stdout or "Shortcut failed.").strip()
            raise RuntimeError(message)

        if os.path.exists(output_path):
            with open(output_path, "r", encoding="utf-8") as handle:
                return handle.read().strip()
        return result.stdout.strip()


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    source = source.strip()
    target = os.environ.get("target_lang", "").strip() or "en-US"
    provider = os.environ.get("provider", "").strip().lower() or "shortcut"

    if not source:
        notify("Translate", "Missing input text.")
        return 1

    try:
        translated = translate(source, target, provider)
    except urllib.error.HTTPError as exc:
        notify("Translate failed", error_message(exc)[:180])
        return 1
    except Exception as exc:
        notify("Translate failed", str(exc)[:180])
        return 1

    if translated is None:
        return 1
    if not translated:
        notify("Translate failed", "Empty response from API.")
        return 1

    print(translated, end="")
    return 0


def translate(source, target, provider):
    if provider == "shortcut":
        return translate_with_shortcut(source, target)
    if provider == "openai":
        return translate_with_openai(source, target)
    return translate_with_deepl(source, target)


if __name__ == "__main__":
    raise SystemExit(main())
